// Calculate transaction size and fee based on BSV's sat/KB model
export const calculateTransactionFee = (
  numInputs: number,
  numOutputs: number,
  dataSize: number,
  feeRatePerKB: number = 1
): { estimatedSize: number; fee: number; remainingCapacity: number } => {
  // Base transaction components - more accurate sizing
  const baseSize = 10; // Version (4) + locktime (4) + marker/flag (2)
  const inputSize = numInputs * 148; // Average P2PKH input size
  const outputSize = numOutputs * 34; // Average P2PKH output size
  const inscriptionOverhead = 20; // Reduced - actual overhead for inscription structure

  // Calculate total transaction size
  const totalSizeBytes = baseSize + inputSize + outputSize + inscriptionOverhead + dataSize;
  const totalSizeKB = totalSizeBytes / 1000;

  // Calculate fee (minimum 1 satoshi)
  const fee = Math.max(1, Math.ceil(totalSizeKB * feeRatePerKB));

  // Calculate remaining capacity before hitting 5MB limit
  const MAX_TX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  const remainingCapacity = MAX_TX_SIZE - totalSizeBytes;

  console.log(`Transaction size calculation (BSV sat/KB model):`);
  console.log(`- Base: ${baseSize} bytes`);
  console.log(`- Inputs (${numInputs}): ${inputSize} bytes`);
  console.log(`- Outputs (${numOutputs}): ${outputSize} bytes`);
  console.log(`- Inscription overhead: ${inscriptionOverhead} bytes`);
  console.log(`- Data size: ${dataSize} bytes (${(dataSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`- Total size: ${totalSizeBytes} bytes (${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`- Fee rate: ${feeRatePerKB} sat/KB`);
  console.log(`- Total fee: ${fee} sats`);
  console.log(`- Remaining capacity: ${(remainingCapacity / 1024 / 1024).toFixed(2)} MB before safe limit`);
  

  return { estimatedSize: totalSizeBytes, fee, remainingCapacity };
};

// Validate transaction size against BSV limits
export const validateTransactionSize = (sizeInBytes: number): { valid: boolean; error?: string } => {
  const MAX_TX_SIZE = 5 * 1024 * 1024; // 5MB
  const SAFE_TX_SIZE = 4.95 * 1024 * 1024; // 4.95MB (leaving small margin)

  if (sizeInBytes > MAX_TX_SIZE) {
    return {
      valid: false,
        error: `Transaction size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds 5MB absolute limit`
    };
  }

  if (sizeInBytes > SAFE_TX_SIZE) {
    console.warn('Transaction size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) is very close to 5MB limit');
  }

  return { valid: true };
};

// Get current fee rate from network
export const fetchNetworkFeeRate = async (network: 'mainnet' | 'testnet'): Promise<number> => {
  try {
    const defaultRateSatPerKB = 1;

    const response = await fetch(
      `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
    ).catch(() => null);

    if (response && response.ok) {
      const feeData = await response.json();
      const feeRatePerByte = feeData.standard || feeData.halfHour || 0.001;
      const feeRatePerKB = feeRatePerByte * 1000;

      const actualRate = Math.max(defaultRateSatPerKB, Math.round(feeRatePerKB));
      console.log('Current network fee rate: ${actualRate} sat/KB');
      return actualRate;
    }
  } catch (error) {
    console.log('Could not fetch fee rate, using default BSV rate');
  }

  const defaultRate = 1;
  console.log('Using default BSV fee rate: ${defaultRate} sat/KB');
  return defaultRate;
};



// // Standardized transaction size limits
// export const SAFE_TX_SIZE = 4.95 * 1024 * 1024; // 4.95MB safe limit
// export const MAX_TX_SIZE = 5 * 1024 * 1024; // 5MB absolute limit

// // Calculate transaction size and fee based on BSV's sat/KB model
// export const calculateTransactionFee = (
//   numInputs: number,
//   numOutputs: number,
//   dataSize: number,
//   feeRatePerKB: number = 1
// ): { estimatedSize: number; fee: number; remainingCapacity: number } => {
//   // Base transaction components - more accurate sizing
//   const baseSize = 10; // Version (4) + locktime (4) + marker/flag (2)
//   const inputSize = numInputs * 148; // Average P2PKH input size
//   const outputSize = numOutputs * 34; // Average P2PKH output size
//   const inscriptionOverhead = 20; // Reduced - actual overhead for inscription structure
  
//   // Calculate total transaction size
//   const totalSizeBytes = baseSize + inputSize + outputSize + inscriptionOverhead + dataSize;
//   const totalSizeKB = totalSizeBytes / 1000;
  
//   // Calculate fee (minimum 1 satoshi)
//   const fee = Math.max(1, Math.ceil(totalSizeKB * feeRatePerKB));
  
//   // Calculate remaining capacity before hitting safe limit
//   const remainingCapacity = SAFE_TX_SIZE - totalSizeBytes;
  
//   console.log(`Transaction size calculation (BSV sat/KB model):`);
//   console.log(`- Base: ${baseSize} bytes`);
//   console.log(`- Inputs (${numInputs}): ${inputSize} bytes`);
//   console.log(`- Outputs (${numOutputs}): ${outputSize} bytes`);
//   console.log(`- Inscription overhead: ${inscriptionOverhead} bytes`);
//   console.log(`- Data size: ${dataSize} bytes (${(dataSize / 1024 / 1024).toFixed(2)} MB)`);
//   console.log(`- Total size: ${totalSizeBytes} bytes (${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB)`);
//   console.log(`- Fee rate: ${feeRatePerKB} sat/KB`);
//   console.log(`- Total fee: ${fee} sats`);
//   console.log(`- Remaining capacity: ${(remainingCapacity / 1024 / 1024).toFixed(2)} MB before safe limit`);
  
//   return { estimatedSize: totalSizeBytes, fee, remainingCapacity };
// };

// // Validate transaction size against BSV limits
// export const validateTransactionSize = (sizeInBytes: number): { valid: boolean; error?: string } => {
//   if (sizeInBytes > MAX_TX_SIZE) {
//     return {
//       valid: false,
//       error: `Transaction size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds 5MB absolute limit`
//     };
//   }
  
//   if (sizeInBytes > SAFE_TX_SIZE) {
//     return {
//       valid: false,
//       error: `Transaction size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds safe limit of ${(SAFE_TX_SIZE / 1024 / 1024).toFixed(2)}MB`
//     };
//   }
  
//   return { valid: true };
// };

// // Get current fee rate from network
// export const fetchNetworkFeeRate = async (network: 'mainnet' | 'testnet'): Promise<number> => {
//   try {
//     const defaultRateSatPerKB = 1;
    
//     const response = await fetch(
//       `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
//     ).catch(() => null);

//     if (response && response.ok) {
//       const feeData = await response.json();
//       const feeRatePerByte = feeData.standard || feeData.halfHour || 0.001;
//       const feeRatePerKB = feeRatePerByte * 1000;
      
//       const actualRate = Math.max(defaultRateSatPerKB, Math.round(feeRatePerKB));
//       console.log(`Current network fee rate: ${actualRate} sat/KB`);
//       return actualRate;
//     }
//   } catch (error) {
//     console.log('Could not fetch fee rate, using default BSV rate');
//   }
  
//   const defaultRate = 1;
//   console.log(`Using default BSV fee rate: ${defaultRate} sat/KB`);
//   return defaultRate;
// };

// // Calculate fees for BCAT chunks
// export const calculateBCATFees = (
//   fileSize: number,
//   chunkSize: number,
//   currentFeeRate: number = 1
// ): { totalChunks: number; estimatedTotalFee: number; perChunkFee: number } => {
//   const totalChunks = Math.ceil(fileSize / chunkSize);
  
//   // Estimate fee per chunk (chunk data + overhead)
//   const chunkOverhead = 300; // Estimated overhead for BCAT_PART transaction
//   const perChunkSize = chunkSize + chunkOverhead;
//   const perChunkFee = Math.ceil((perChunkSize / 1000) * currentFeeRate);
  
//   // Main transaction fee (thumbnail + references)
//   const thumbnailSize = 50 * 1024; // Assume ~50KB thumbnail
//   const referencesSize = totalChunks * 32; // 32 bytes per chunk reference
//   const mainTxSize = thumbnailSize + referencesSize + 500; // Include overhead
//   const mainTxFee = Math.ceil((mainTxSize / 1000) * currentFeeRate);
  
//   const estimatedTotalFee = (perChunkFee * totalChunks) + mainTxFee;
  
//   console.log(`BCAT fee calculation:`);
//   console.log(`- File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
//   console.log(`- Chunk size: ${(chunkSize / 1024 / 1024).toFixed(2)}MB`);
//   console.log(`- Total chunks: ${totalChunks}`);
//   console.log(`- Fee per chunk: ${perChunkFee} sats`);
//   console.log(`- Main tx fee: ${mainTxFee} sats`);
//   console.log(`- Total estimated fee: ${estimatedTotalFee} sats`);
  
//   return { totalChunks, estimatedTotalFee, perChunkFee };
// };