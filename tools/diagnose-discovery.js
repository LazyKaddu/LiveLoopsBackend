#!/usr/bin/env node

/**
 * Diagnostic script to verify service discovery setup
 * Run this to check if server-audio and server-sync can find each other via Redis
 * 
 * Usage: node tools/diagnose-discovery.js
 */

import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config({ path: "./apps/server-sync/.env" });

async function diagnose() {
  console.log("🔍 Service Discovery Diagnostic\n");
  
  try {
    // Connect to Redis
    const redisClient = createClient({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      url: process.env.REDIS_URL
    });

    console.log(`📡 Connecting to Redis at ${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}...`);
    await redisClient.connect();
    console.log("✅ Redis connected\n");

    // Check audio-servers hash
    console.log("📋 Checking audio-servers registry...");
    const audioServers = await redisClient.hGetAll("audio-servers");
    
    if (Object.keys(audioServers).length === 0) {
      console.log("❌ No audio servers registered!");
      console.log("   Make sure server-audio is running and has registered itself.\n");
    } else {
      console.log(`✅ Found ${Object.keys(audioServers).length} audio server(s):\n`);
      for (const [id, data] of Object.entries(audioServers)) {
        try {
          const server = JSON.parse(data);
          console.log(`   ID: ${id}`);
          console.log(`   Address: ${server.address}`);
          console.log(`   Port: ${server.port}`);
          console.log(`   Uptime: ${Math.round(server.uptime)}s`);
          console.log();
        } catch (e) {
          console.log(`   ID: ${id}`);
          console.log(`   Data: ${data}\n`);
        }
      }
    }

    // Check sync servers
    console.log("📋 Checking sync servers registry...");
    const syncServers = await redisClient.smembers("gw:servers:audio");
    
    if (syncServers.length === 0) {
      console.log("ℹ️  No sync servers registered yet (this is expected if server-sync just started)\n");
    } else {
      console.log(`Found ${syncServers.length} sync server(s): ${syncServers.join(", ")}\n`);
    }

    // Test connectivity
    if (Object.keys(audioServers).length > 0) {
      console.log("🧪 Testing connectivity to audio servers...");
      const firstServer = Object.values(audioServers)[0];
      const serverData = JSON.parse(firstServer);
      
      try {
        const response = await fetch(`${serverData.address}/health`, { timeout: 5000 });
        if (response.ok) {
          console.log(`✅ Successfully connected to ${serverData.address}/health`);
        } else {
          console.log(`⚠️  Got response ${response.status} from ${serverData.address}/health`);
        }
      } catch (e) {
        console.log(`❌ Failed to connect to ${serverData.address}: ${e.message}`);
        console.log("   This might indicate a network connectivity issue.\n");
      }
    }

    console.log("📊 Redis Keys Summary:");
    const keys = await redisClient.keys("*");
    console.log(`   Total keys: ${keys.length}`);
    console.log(`   Keys: ${keys.join(", ")}\n`);

    await redisClient.quit();
    console.log("✅ Diagnostic complete");
    
  } catch (error) {
    console.error("❌ Error during diagnostic:", error.message);
    process.exit(1);
  }
}

diagnose();
