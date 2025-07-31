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
  console.log(`- Remaining capacity: ${(remainingCapacity / 1024 / 1024).toFixed(2)} MB`);
  
  return { estimatedSize: totalSizeBytes, fee, remainingCapacity };
};

// Validate transaction size against BSV limits
export const validateTransactionSize = (sizeInBytes: number): { valid: boolean; error?: string } => {
  const MAX_TX_SIZE = 5 * 1024 * 1024; // 5MB
  const SAFE_TX_SIZE = 4.95 * 1024 * 1024; // 4.95MB (leaving small margin)
  
  if (sizeInBytes > MAX_TX_SIZE) {
    return {
      valid: false,
      error: `Transaction size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit`
    };
  }
  
  if (sizeInBytes > SAFE_TX_SIZE) {
    console.warn(`Transaction size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) is very close to 5MB limit`);
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
      console.log(`Current network fee rate: ${actualRate} sat/KB`);
      return actualRate;
    }
  } catch (error) {
    console.log('Could not fetch fee rate, using default BSV rate');
  }
  
  const defaultRate = 1;
  console.log(`Using default BSV fee rate: ${defaultRate} sat/KB`);
  return defaultRate;
};