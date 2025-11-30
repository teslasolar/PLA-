/**
 * WebGPU Compute Engine
 * GPU-accelerated tensor operations
 */
export class WebGPUCompute {
    constructor(device, queue) {
        this.device = device;
        this.queue = queue;
        this.pipelines = new Map();
    }

    static async init() {
        if (!navigator.gpu) throw new Error('WebGPU not supported');

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('No GPU adapter');

        const device = await adapter.requestDevice();
        const queue = device.queue;

        const gpu = new WebGPUCompute(device, queue);
        await gpu._initPipelines();
        return gpu;
    }

    async _initPipelines() {
        // Matrix multiply shader
        this.pipelines.set('matmul', await this._createPipeline(`
            @group(0) @binding(0) var<storage, read> a: array<f32>;
            @group(0) @binding(1) var<storage, read> b: array<f32>;
            @group(0) @binding(2) var<storage, read_write> c: array<f32>;
            @group(0) @binding(3) var<uniform> dims: vec4<u32>;

            @compute @workgroup_size(8, 8)
            fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
                let M = dims.x; let N = dims.y; let K = dims.z;
                if (gid.x >= M || gid.y >= N) { return; }
                var sum: f32 = 0.0;
                for (var k: u32 = 0u; k < K; k = k + 1u) {
                    sum = sum + a[gid.x * K + k] * b[k * N + gid.y];
                }
                c[gid.x * N + gid.y] = sum;
            }
        `));

        // Element-wise add shader
        this.pipelines.set('add', await this._createPipeline(`
            @group(0) @binding(0) var<storage, read> a: array<f32>;
            @group(0) @binding(1) var<storage, read> b: array<f32>;
            @group(0) @binding(2) var<storage, read_write> c: array<f32>;

            @compute @workgroup_size(256)
            fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
                c[gid.x] = a[gid.x] + b[gid.x];
            }
        `));
    }

    async _createPipeline(code) {
        const module = this.device.createShaderModule({ code });
        return this.device.createComputePipeline({
            layout: 'auto',
            compute: { module, entryPoint: 'main' }
        });
    }

    async compute(a, b, op = '@') {
        const pipeline = this.pipelines.get(op === '@' ? 'matmul' : 'add');
        if (!pipeline) throw new Error(`Unknown op: ${op}`);
        // Implementation continues in compute-ops.js
        return this._runPipeline(pipeline, a, b, op);
    }

    async _runPipeline(pipeline, a, b, op) {
        const flatA = a.flat();
        const flatB = b.flat();
        const bufA = this._createBuffer(flatA);
        const bufB = this._createBuffer(flatB);
        const bufC = this._createBuffer(new Float32Array(flatA.length));
        // Execute and read back
        return this._execute(pipeline, bufA, bufB, bufC, flatA.length);
    }

    _createBuffer(data) {
        const buf = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.queue.writeBuffer(buf, 0, data);
        return buf;
    }

    async _execute(pipeline, bufA, bufB, bufC, size) {
        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: bufA } },
                { binding: 1, resource: { buffer: bufB } },
                { binding: 2, resource: { buffer: bufC } }
            ]
        });
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(size / 256));
        pass.end();
        this.queue.submit([encoder.finish()]);
        return await this._readBuffer(bufC, size);
    }

    async _readBuffer(buf, size) {
        const readBuf = this.device.createBuffer({
            size: size * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(buf, 0, readBuf, 0, size * 4);
        this.queue.submit([encoder.finish()]);
        await readBuf.mapAsync(GPUMapMode.READ);
        const result = new Float32Array(readBuf.getMappedRange().slice(0));
        readBuf.unmap();
        return result;
    }

    getInfo() {
        return { backend: 'WebGPU', ready: true };
    }
}

export default WebGPUCompute;
