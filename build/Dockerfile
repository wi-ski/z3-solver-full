FROM emscripten/emsdk:3.1.73

ARG Z3_VERSION=z3-4.16.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 cmake ninja-build git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /z3
RUN git clone --depth 1 --branch ${Z3_VERSION} https://github.com/Z3Prover/z3.git .

WORKDIR /z3/src/api/js
RUN npm install

# Replace the upstream build script with ours (-fwasm-exceptions)
COPY build-wasm.ts scripts/build-wasm.ts

RUN npx ts-node scripts/build-wasm.ts

# Generate the TS wrapper and types.
# make-ts-wrapper.ts takes two output paths. Skip strict to work around TS2454.
RUN npx ts-node --compiler-options '{"strict":false}' \
    scripts/make-ts-wrapper.ts \
    build/low-level/wrapper.__GENERATED__.ts \
    build/low-level/types.__GENERATED__.ts || true

RUN mkdir -p /output && \
    cp build/z3-built.js /output/ && \
    cp build/z3-built.wasm /output/ && \
    (cp build/low-level/wrapper.__GENERATED__.ts /output/ 2>/dev/null || true) && \
    (cp build/low-level/types.__GENERATED__.ts /output/ 2>/dev/null || true)
