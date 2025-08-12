interface TestResult {
  size: number;
  uploadSuccess: boolean;
  uploadTime?: number;
  retrievalSuccess: boolean;
  retrievalTime?: number;
  maxRetrievable?: number;
  error?: string;
}

interface TestReport {
  timestamp: Date;
  network: string;
  results: TestResult[];
  recommendedSize?: number;
  maxWorkingSize?: number;
}

export class BCATTestSuite {
  private results: TestResult[] = [];
  
  constructor(
    private network: 'mainnet' | 'testnet',
    private apiKey?: string
  ) {}

  // Quick test to determine optimal chunk size
  async quickChunkTest(): Promise<{ recommendedSize: number }> {
    const testSizes = [50, 75, 95, 100]; // KB
    
    for (const sizeKB of testSizes) {
      const result = await this.testChunkSize(sizeKB * 1024);
      if (!result.retrievalSuccess) {
        const prevSize = testSizes[testSizes.indexOf(sizeKB) - 1] || 50;
        return { recommendedSize: prevSize * 1024 };
      }
    }
    
    return { recommendedSize: 95 * 1024 };
  }

  // Test specific chunk size
  async testChunkSize(size: number): Promise<TestResult> {
    const testData = new Uint8Array(size);
    crypto.getRandomValues(testData);
    
    try {
      // Test upload
      const uploadStart = Date.now();
      const txid = await this.uploadTestChunk(testData);
      const uploadTime = Date.now() - uploadStart;
      
      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test retrieval
      const retrievalStart = Date.now();
      const retrieved = await this.retrieveTestChunk(txid);
      const retrievalTime = Date.now() - retrievalStart;
      
      // Verify integrity
      const success = this.compareArrays(testData, retrieved);
      
      return {
        size,
        uploadSuccess: true,
        uploadTime,
        retrievalSuccess: success,
        retrievalTime,
        maxRetrievable: retrieved.length
      };
      
    } catch (error) {
      return {
        size,
        uploadSuccess: false,
        retrievalSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Full test suite
  async runFullTestSuite(): Promise<TestReport> {
    const sizes = [25, 50, 75, 95, 100, 125, 150, 200, 250, 300, 400, 490]; // KB
    this.results = [];
    
    console.log('Starting BCAT chunk size test suite...');
    
    for (const sizeKB of sizes) {
      console.log(`Testing ${sizeKB}KB chunk...`);
      const result = await this.testChunkSize(sizeKB * 1024);
      this.results.push(result);
      
      console.log(`${sizeKB}KB: Upload ${result.uploadSuccess ? '✓' : '✗'}, ` +
                  `Retrieval ${result.retrievalSuccess ? '✓' : '✗'}`);
      
      if (!result.retrievalSuccess && result.uploadSuccess) {
        console.log(`Max retrievable: ${result.maxRetrievable} bytes`);
        break; // Stop testing larger sizes
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return this.generateReport();
  }

  // Generate test report
  private generateReport(): TestReport {
    const workingResults = this.results.filter(r => r.retrievalSuccess);
    const maxWorkingSize = Math.max(...workingResults.map(r => r.size));
    
    // Recommend 90% of max working size for safety margin
    const recommendedSize = Math.floor(maxWorkingSize * 0.9);
    
    return {
      timestamp: new Date(),
      network: this.network,
      results: this.results,
      recommendedSize,
      maxWorkingSize
    };
  }

  // Test upload (mock or real)
  private async uploadTestChunk(data: Uint8Array): Promise<string> {
    // In production, this would create and broadcast a real BCAT part transaction
    // For testing, we can use a mock or test endpoint
    
    if (this.network === 'testnet') {
      // Real upload for testnet
      // ... implement actual upload
      return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else {
      // Mock for mainnet testing
      return `mock_${Date.now()}_${data.length}`;
    }
  }

  // Test retrieval
  private async retrieveTestChunk(txid: string): Promise<Uint8Array> {
    if (txid.startsWith('mock_')) {
      // Return mock data for testing
      const size = parseInt(txid.split('_')[2]);
      return new Uint8Array(size);
    }
    
    // Real retrieval from WhatsOnChain or other API
    const headers: any = {};
    if (this.apiKey) {
      headers['woc-api-key'] = this.apiKey;
    }
    
    const response = await fetch(
      `https://api.whatsonchain.com/v1/bsv/${this.network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error('Failed to retrieve test chunk');
    }
    
    const txData = await response.json();
    
    // Extract data from OP_RETURN
    // ... implement extraction logic
    
    return new Uint8Array(0); // Placeholder
  }

  // Compare arrays for integrity check
  private compareArrays(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Export test results
  exportResults(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  // Simulate various network conditions
// Ensure TestReport is defined elsewhere in your codebase.

async testWithNetworkConditions(
  latency: number,
  packetLoss: number
): Promise<TestReport> {
  // clamp packetLoss to [0, 1]
  const loss = Math.max(0, Math.min(1, packetLoss));

  const originalFetch = window.fetch;

  // Patch fetch to simulate latency and packet loss
  window.fetch = (async (...args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
    // Add latency
    await new Promise<void>(resolve => setTimeout(resolve, latency));

    // Simulate packet loss
    if (Math.random() < loss) {
      throw new Error('Network timeout (simulated)');
    }

    return originalFetch(...args);
  }) as typeof fetch;

  try {
    const report = await this.runFullTestSuite();
    return report;
  } finally {
    // Always restore original fetch, even if the test throws
    window.fetch = originalFetch;
  }
} // <-- this brace ends testWithNetworkConditions

// Test chunking algorithms
async testChunkingAlgorithms(): Promise<void> {
  const testFile = new File(
    [new ArrayBuffer(10 * 1024 * 1024)], // 10MB test file
    'test.bin',
    { type: 'application/octet-stream' }
  );

  const algorithms = [
    { name: 'Fixed Size', chunkSize: 100 * 1024 },
    { name: 'Dynamic', chunkSize: 'dynamic' as const },
    { name: 'Adaptive', chunkSize: 'adaptive' as const }
  ];

  for (const algo of algorithms) {
    console.log(`Testing ${algo.name} chunking...`);
    const start = Date.now();

    // Test chunking speed and efficiency
    const chunks = await this.chunkWithAlgorithm(testFile, algo);

    const time = Date.now() - start;
    console.log(`${algo.name}: ${chunks.length} chunks in ${time}ms`);
  }
}

private async chunkWithAlgorithm(
  file: File,
  algorithm: { name: string; chunkSize: number | 'dynamic' | 'adaptive' }
): Promise<ArrayBuffer[]> {
  if (algorithm.chunkSize === 'dynamic') {
    // Dynamic chunking based on file size
    const size =
      file.size < 1 * 1024 * 1024 ? 50 * 1024 :
      file.size < 10 * 1024 * 1024 ? 100 * 1024 :
      200 * 1024;
    return this.chunkFile(file, size);
  } else if (algorithm.chunkSize === 'adaptive') {
    // Adaptive chunking based on network speed
    const networkSpeed = await this.measureNetworkSpeed(); // kbps or your chosen unit
    const size =
      networkSpeed > 1000 ? 200 * 1024 :
      networkSpeed > 500  ? 100 * 1024 :
                            50 * 1024;
    return this.chunkFile(file, size);
  } else {
    return this.chunkFile(file, algorithm.chunkSize);
  }
}

 
 private async chunkFile(file: File, chunkSize: number): Promise<ArrayBuffer[]> {
   const chunks: ArrayBuffer[] = [];
   let offset = 0;
   
   while (offset < file.size) {
     const chunk = await file.slice(offset, offset + chunkSize).arrayBuffer();
     chunks.push(chunk);
     offset += chunkSize;
   }
   
   return chunks;
 }
 
 private async measureNetworkSpeed(): Promise<number> {
   // Measure network speed with a small test upload
   const testData = new Uint8Array(10 * 1024); // 10KB test
   const start = Date.now();
   
   try {
     await fetch('https://api.whatsonchain.com/v1/bsv/test/info', {
       method: 'GET'
     });
     
     const time = Date.now() - start;
     return (10 * 1024 * 8) / (time / 1000); // bits per second
   } catch {
     return 500; // Default to medium speed
   }
 }
}