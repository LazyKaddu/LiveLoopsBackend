// synths/base/filter.js

export class LowPassFilter {

    constructor(sampleRate = 48000) {

        this.sampleRate = sampleRate;

        this.cutoff = 2000;
        this.res = 0.1;

        this.z1 = 0;
        this.z2 = 0;
    }

    setCutoff(c) {
        this.cutoff = c;
    }

    setRes(r) {
        this.res = r;
    }

    processSample(x) {

        const f =
            2 *
            Math.sin(
                Math.PI *
                this.cutoff /
                this.sampleRate
            );

        this.z1 += f * (x - this.z1 + this.res * (this.z1 - this.z2));
        this.z2 += f * (this.z1 - this.z2);

        return this.z2;
    }

    process(buffer) {

        for (let i = 0; i < buffer.length; i++) {
            buffer[i] =
                this.processSample(buffer[i]);
        }

        return buffer;
    }
}


export class BandPassFilter {

    constructor(sampleRate = 48000) {

        this.sampleRate = sampleRate;

        this.cutoff = 1000;
        this.res = 0.1;

        this.z1 = 0;
        this.z2 = 0;
    }

    setCutoff(c) {
        this.cutoff = c;
    }

    setRes(r) {
        this.res = r;
    }

    processSample(x) {

        const f =
            2 *
            Math.sin(
                Math.PI *
                this.cutoff /
                this.sampleRate
            );

        // state-variable structure
        this.z1 += f * (x - this.z1 - this.res * this.z2);
        this.z2 += f * this.z1;

        return this.z1;   // band component
    }

    process(buffer) {

        for (let i = 0; i < buffer.length; i++)
            buffer[i] = this.processSample(buffer[i]);

        return buffer;
    }
}


// ================= HIGH PASS =================

export class HighPassFilter {

    constructor(sampleRate = 48000) {

        this.sampleRate = sampleRate;

        this.cutoff = 800;
        this.res = 0.1;

        this.z1 = 0;
        this.z2 = 0;
    }

    setCutoff(c) {
        this.cutoff = c;
    }

    setRes(r) {
        this.res = r;
    }

    processSample(x) {

        const f =
            2 *
            Math.sin(
                Math.PI *
                this.cutoff /
                this.sampleRate
            );

        // state-variable
        this.z1 += f * (x - this.z1 + this.res * (this.z1 - this.z2));
        this.z2 += f * (this.z1 - this.z2);

        // high = input - low - res*band
        const low = this.z2;
        const band = this.z1;

        return x - low - this.res * band;
    }

    process(buffer) {

        for (let i = 0; i < buffer.length; i++)
            buffer[i] = this.processSample(buffer[i]);

        return buffer;
    }
}