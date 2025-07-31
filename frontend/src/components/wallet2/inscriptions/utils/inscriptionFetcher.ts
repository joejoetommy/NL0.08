import { InscriptionData } from '../components/ViewInscriptions';
import { EncryptionLevel } from './BlogEncryption';

// Fetch inscriptions from blockchain
export const fetchInscriptionsFromChain = async (
  address: string,
  network: 'mainnet' | 'testnet',
  whatsOnChainApiKey?: string
): Promise<InscriptionData[]> => {
  const headers: any = {};
  if (whatsOnChainApiKey) {
    headers['woc-api-key'] = whatsOnChainApiKey;
  }

  const historyUrl = `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/address/${address}/history`;
  console.log('Fetching from:', historyUrl);
  
  const historyResponse = await fetch(historyUrl, { headers });
  
  if (!historyResponse.ok) {
    throw new Error(`Failed to fetch history: ${historyResponse.status}`);
  }

  const history = await historyResponse.json();
  console.log(`Found ${history.length} transactions`);

  const foundInscriptions: InscriptionData[] = [];
  
  // Process recent transactions (limit to 30 for performance)
  for (const tx of history.slice(0, 30)) {
    try {
      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${tx.tx_hash}`,
        { headers }
      );

      if (!txResponse.ok) continue;

      const txData = await txResponse.json();
      
      // Check each output for inscriptions
      for (let i = 0; i < txData.vout.length; i++) {
        const vout = txData.vout[i];
        
        // Look for 1-sat outputs (typical for inscriptions)
        if (vout.value === 0.00000001) {
          console.log(`Found 1 sat output in ${tx.tx_hash}:${i}`);
          
          const scriptHex = vout.scriptPubKey?.hex || '';
          const inscriptionData = parseInscriptionFromScript(scriptHex, tx.tx_hash, i, tx.time, txData);
          
          if (inscriptionData) {
            foundInscriptions.push(inscriptionData);
          }
        }
      }
    } catch (e) {
      console.error(`Error processing tx ${tx.tx_hash}:`, e);
    }
  }
  
  console.log(`Found ${foundInscriptions.length} inscriptions`);
  return foundInscriptions;
};

// Parse inscription data from script
const parseInscriptionFromScript = (
  scriptHex: string, 
  txid: string, 
  vout: number, 
  timestamp?: number,
  txData?: any
): InscriptionData | null => {
  let inscriptionType: 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile' | 'unknown' = 'unknown';
  let content: any = null;
  let encrypted = false;
  let encryptionLevel: EncryptionLevel = 0;
  let bcatInfo: { chunks: string[]; metadata: any } | undefined;
  
  try {
    // Check for BCAT inscriptions (they have OP_RETURN with BCAT prefix in second output)
    if (txData && txData.vout && txData.vout.length > 1) {
      const opReturnOutput = txData.vout.find((out: any) => 
        out.scriptPubKey?.asm?.startsWith('OP_RETURN') || 
        out.scriptPubKey?.hex?.startsWith('6a')
      );
      
      if (opReturnOutput && opReturnOutput.scriptPubKey?.hex) {
        const opReturnHex = opReturnOutput.scriptPubKey.hex;
        // Check for BCAT prefix (15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up)
        const bcatPrefixHex = '313544484678575a4a5435386639336e6879476e7352427172677757344b57366834557';
        
        if (opReturnHex.includes(bcatPrefixHex)) {
          inscriptionType = 'largeProfile';
          
          // Extract chunk transaction IDs and metadata
          try {
            // Parse BCAT data from OP_RETURN
            const chunks: string[] = [];
            let metadata: any = {};
            
            // Skip OP_RETURN and BCAT prefix to get to chunk data
            // This is simplified - actual parsing would need to handle push data opcodes properly
            
            bcatInfo = { chunks, metadata };
          } catch (e) {
            console.error('Error parsing BCAT data:', e);
          }
          
          // Get thumbnail from first output if it's an inscription
          if (scriptHex.includes('746578742f706c61696e') || scriptHex.includes('696d6167652f')) {
            // Extract thumbnail data if present
            content = 'thumbnail'; // Placeholder - would extract actual thumbnail
          }
        }
      }
    }
    
    // Check for text/plain inscriptions
    if (inscriptionType === 'unknown' && scriptHex.includes('746578742f706c61696e')) { // "text/plain"
      inscriptionType = 'text';
      const textMatch = scriptHex.match(/746578742f706c61696e[0-9a-f]*?00([0-9a-f]+?)68/);
      if (textMatch && textMatch[1]) {
        const hexStr = textMatch[1];
        let extractedContent = '';
        for (let i = 0; i < hexStr.length; i += 2) {
          extractedContent += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
        }
        
        // Check if it's encrypted JSON
        try {
          const parsed = JSON.parse(extractedContent);
          if (parsed.encrypted && parsed.data) {
            encrypted = true;
            encryptionLevel = parsed.metadata?.level || 0;
            content = parsed;
          } else {
            content = extractedContent;
          }
        } catch {
          // Not JSON, just plain text
          content = extractedContent;
        }
      }
    } 
    // Check for application/json inscriptions
    else if (scriptHex.includes('6170706c69636174696f6e2f6a736f6e')) { // "application/json"
      const jsonMatch = scriptHex.match(/6170706c69636174696f6e2f6a736f6e[0-9a-f]*?00([0-9a-f]+?)68/);
      if (jsonMatch && jsonMatch[1]) {
        const hexStr = jsonMatch[1];
        let jsonStr = '';
        for (let i = 0; i < hexStr.length; i += 2) {
          jsonStr += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
        }
        
        try {
          content = JSON.parse(jsonStr);
          
          // Check if it's encrypted
          if (content.encrypted && content.data) {
            encrypted = true;
            encryptionLevel = content.metadata?.level || 0;
          }
          
          // Determine profile type
          if (content.p === 'profile2' || (content.encrypted && content.originalType === 'profile2')) {
            inscriptionType = 'profile2';
          } else if (content.p === 'profile' || (content.encrypted && content.originalType === 'profile')) {
            inscriptionType = 'profile';
          } else if (content.encrypted && content.originalType === 'image') {
            inscriptionType = 'image';
          } else if (content.encrypted && content.originalType === 'text') {
            inscriptionType = 'text';
          } else {
            // Default to profile for JSON without specific type
            inscriptionType = 'profile';
          }
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          inscriptionType = 'profile';
        }
      }
    } 
    // Check for image inscriptions
    else if (scriptHex.includes('696d6167652f')) { // "image/"
      inscriptionType = 'image';
      // For images, we don't extract the full data here due to size
      // It will be fetched on-demand when viewing
    }
    
    if (inscriptionType !== 'unknown') {
      return {
        id: 0, // Will be set by the caller
        txid,
        vout,
        timestamp: new Date((timestamp || 0) * 1000 || Date.now()),
        inscriptionType,
        content,
        size: scriptHex.length / 2,
        origin: `${txid}_${vout}`,
        scriptHex,
        encrypted,
        encryptionLevel: encryptionLevel as EncryptionLevel,
        bcatInfo
      };
    }
  } catch (e) {
    console.error('Error parsing inscription:', e);
  }
  
  return null;
};

// Extract image data from script hex
export const extractImageFromScript = (scriptHex: string): { type: string; data: string } | null => {
  try {
    // Look for common image MIME types
    const imageTypes = [
      { hex: '696d6167652f706e67', type: 'image/png' },
      { hex: '696d6167652f6a706567', type: 'image/jpeg' },
      { hex: '696d6167652f6a7067', type: 'image/jpg' },
      { hex: '696d6167652f676966', type: 'image/gif' },
      { hex: '696d6167652f77656270', type: 'image/webp' }
    ];
    
    for (const imgType of imageTypes) {
      if (scriptHex.includes(imgType.hex)) {
        // Extract image data after the MIME type
        const regex = new RegExp(`${imgType.hex}[0-9a-f]*?00([0-9a-f]+?)68`);
        const match = scriptHex.match(regex);
        
        if (match && match[1]) {
          return {
            type: imgType.type,
            data: match[1]
          };
        }
      }
    }
  } catch (e) {
    console.error('Error extracting image:', e);
  }
  
  return null;
};