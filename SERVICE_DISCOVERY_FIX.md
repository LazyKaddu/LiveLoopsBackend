# Service Discovery Fix - server-sync ↔ server-audio

## The Problem

Server-sync was unable to discover server-audio even though both were registering in Redis. This was caused by a **key naming mismatch** in service discovery:

### Root Causes:

1. **Different Registration Systems**
   - `server-audio`: Uses `RedisRegistry` → stores in hash `audio-servers` with key `{hostname}:{port}`
   - `server-sync`: Uses `RedisMap` → stores in set `gw:servers:audio` with prefix keys

2. **Wrong Discovery Keys**
   - `audioBridge.js` was searching for keys matching `server-audio:*` (which don't exist!)
   - It should have been querying the `audio-servers` hash where server-audio actually registers

3. **Unreachable Host**
   - `server-audio` was registering with `os.hostname()` which might not be resolvable
   - In containerized or local environments, this could point to an unreachable hostname

## The Solution

### 1. Fixed audioBridge Discovery ✅
Updated [apps/server-sync/src/forwarder/audioBridge.js](apps/server-sync/src/forwarder/audioBridge.js#L36-L65) to:
- Query the `audio-servers` hash using `hGetAll()` 
- Extract addresses from the registered server data
- Build proper URLs from the address field

### 2. Made server-audio Registration Configurable ✅
Updated [apps/server-audio/src/core/redisRegistry.js](apps/server-audio/src/core/redisRegistry.js) to:
- Accept `ADVERTISE_HOST` environment variable
- Fall back to `AUDIO_SERVER_HOST`, `HOST`, then `localhost`
- Register with a properly configured, reachable address

### 3. Added Configuration ✅
Created `.env` file for [apps/server-audio/.env](apps/server-audio/.env) with:
```dotenv
ADVERTISE_HOST=localhost  # Change this to your reachable host
REDIS_HOST=localhost
REDIS_PORT=6379
```

## How It Works Now

```
1. server-audio starts
   └─> Reads ADVERTISE_HOST from .env (or uses localhost)
   └─> Registers in Redis hash "audio-servers" with address: http://localhost:4000
   └─> Updates registration every 5 seconds (heartbeat)

2. server-sync starts
   └─> AudioBridge queries Redis hash "audio-servers"
   └─> Finds server-audio's registration with its address
   └─> Connects via Socket.IO to http://localhost:4000
   └─> Starts forwarding MIDI bundles
```

## Setup Instructions

### For Local Development

**server-audio/.env:**
```dotenv
PORT=4000
ADVERTISE_HOST=localhost
REDIS_HOST=localhost
REDIS_PORT=6379
```

**server-sync/.env:**
```dotenv
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
```

### For Docker/Container Environment

Set the host to the service name defined in docker-compose or k8s:

**server-audio/.env:**
```dotenv
PORT=4000
ADVERTISE_HOST=server-audio  # Docker service name
REDIS_HOST=redis
REDIS_PORT=6379
```

**server-sync/.env:**
```dotenv
PORT=3001
REDIS_HOST=redis
REDIS_PORT=6379
```

### For Kubernetes

Use StatefulSet hostnames or service DNS:

**server-audio/.env:**
```dotenv
PORT=4000
ADVERTISE_HOST=server-audio-0.server-audio  # k8s service DNS
REDIS_HOST=redis-service
REDIS_PORT=6379
```

## Verification

### Method 1: Check Redis Directly
```bash
redis-cli
HGETALL audio-servers
```

Should show:
```
1) "localhost:4000"
2) "{\"host\":\"localhost\",\"port\":4000,\"address\":\"http://localhost:4000\",\"pid\":12345,\"uptime\":123.45,\"timestamp\":1234567890}"
```

### Method 2: Use Diagnostic Script
```bash
node tools/diagnose-discovery.js
```

This will:
- ✅ Connect to Redis
- ✅ List all registered audio servers
- ✅ Test connectivity to each server
- ✅ Show all Redis keys

### Method 3: Check Logs
Monitor both servers' logs for discovery success:

**server-audio:**
```
[Redis] Registered as localhost:4000 at http://localhost:4000
```

**server-sync:**
```
[AudioBridge] Discovered 1 audio server(s), selected: localhost:4000 at http://localhost:4000
[AudioBridge] Initialization successful, connecting to http://localhost:4000
```

## Troubleshooting

### "No available audio server found in Redis"

1. **Check if server-audio is running:** `ps aux | grep server-audio`
2. **Check Redis connectivity:** `redis-cli ping` (should return PONG)
3. **Verify the registration:** 
   ```bash
   redis-cli HGETALL audio-servers
   ```
4. **Check ADVERTISE_HOST:** 
   - Must be reachable from server-sync
   - For local dev: use `localhost`
   - For Docker: use service name
   - For K8s: use DNS name

### "Connection refused" or "Unable to reach audio server"

The `ADVERTISE_HOST` is not reachable from server-sync:
- ✅ Check firewall rules
- ✅ Verify DNS resolution: `ping <ADVERTISE_HOST>`
- ✅ Ensure both services can communicate on the network
- ✅ Check port 4000 is open and server-audio is listening

### Redis keys not expiring

server-audio heartbeat might be failing. Check:
- Redis connection logs in server-audio
- RDB persistence in Redis
- Memory availability in Redis

## Files Changed

1. [apps/server-sync/src/forwarder/audioBridge.js](apps/server-sync/src/forwarder/audioBridge.js)
   - Fixed `discoverAudioServer()` to query "audio-servers" hash
   - Improved logging for debugging

2. [apps/server-audio/src/core/redisRegistry.js](apps/server-audio/src/core/redisRegistry.js)
   - Made registration host configurable via environment variables
   - Added ADVERTISE_HOST support

3. [apps/server-audio/.env](apps/server-audio/.env) **(New)**
   - Created configuration file for server-audio

4. [tools/diagnose-discovery.js](tools/diagnose-discovery.js) **(New)**
   - Diagnostic script to verify service discovery setup
