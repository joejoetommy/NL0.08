import React, { useState } from 'react';
import { PrivateKey, Transaction, P2PKH, Script, Utils } from '@bsv/sdk';
import { UTXOManager } from '../../components/wallet2/utils/blockchain';
import { BroadcastService } from '../../components/wallet2/services/BroadcastService';
import { createInscriptionScript } from '../../components/wallet2/inscriptions/utils/inscriptionCreator';
import { BlogEncryption, EncryptionLevel, getEncryptionLevelLabel } from '../../components/wallet2/inscriptions/utils/BlogEncryption';

// Add application fee addresses at the top
const APPLICATION_FEE_ADDRESSES = {
  testnet: 'mhEgcun5ekQrXLgwLmkhHQeK3ftjZynHRL',
  mainnet: '12ijKrh6qiybkEDKdCnKTVRzBgJ2bVSLyA'
};

// ... (keep all existing imports and other constants)

export const CreateLargeProfileInscription1: React.FC<CreateLargeProfileInscriptionProps> = ({
  // ... keep all existing props
}) => {
  // ... keep all existing state variables and early functions

  // Updated uploadSingleChunk function
  const uploadSingleChunk = async (chunkIndex: number): Promise<{ success: boolean; txid?: string; error?: string }> => {
    const chunkState = chunkStates[chunkIndex];
    if (!chunkState) {
      return { success: false, error: 'Chunk not found' };
    }

    if (chunkState.status === 'success' && chunkState.txid) {
      return { success: true, txid: chunkState.txid };
    }

    const broadcastService = new BroadcastService(network, (message: string) => {
      setStatus({ type: 'info', message: `Chunk ${chunkIndex + 1}: ${message}` });
    }, 10000);
    
    const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
    const address = privateKey.toPublicKey().toAddress();
    
    try {
      setChunkStates(prevStates => {
        const newStates = [...prevStates];
        newStates[chunkIndex] = { 
          ...newStates[chunkIndex], 
          status: 'uploading',
          attempts: newStates[chunkIndex].attempts + 1,
          lastAttemptTime: Date.now()
        };
        return newStates;
      });

      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs(true);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available');
      }
      
      const chunkData = chunkState.chunkData;
      const minerFee = Math.ceil((300 + chunkData.length) / 1000) * currentFeeRate;
      const applicationFee = minerFee; // Application fee equals miner fee
      const totalRequired = minerFee + applicationFee;
      
      const { selected, total } = utxoManager.selectUTXOs(totalRequired);
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. Need ${totalRequired} sats (miner fee: ${minerFee}, app fee: ${applicationFee})`);
      }
      
      const tx = new Transaction();
      
      // Add inputs with proper sourceTransaction structure
      let totalInput = 0;
      for (const utxo of selected) {
        const txid = utxo.tx_hash || utxo.txid;
        const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
        const satoshis = utxo.value || utxo.satoshis || 0;
        
        totalInput += satoshis;
        
        // Create properly structured sourceTransaction
        const sourceTransaction = {
          id: txid,
          version: 1,
          inputs: [],
          outputs: [],
          lockTime: 0
        };
        
        // Ensure outputs array is properly initialized up to the vout index
        for (let i = 0; i <= vout; i++) {
          sourceTransaction.outputs[i] = {
            satoshis: i === vout ? satoshis : 0,
            lockingScript: new P2PKH().lock(address)
          };
        }
        
        tx.addInput({
          sourceTXID: txid,
          sourceOutputIndex: vout,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
          sourceTransaction: sourceTransaction
        });
      }




      
      // Create BCAT part output with proper OP_RETURN structure
      let scriptHex = '6a';
      
      // Add BCAT part namespace
      const namespaceBytes = Utils.toArray(BCAT_PART_NAMESPACE, 'utf8');
      if (namespaceBytes.length <= 75) {
        scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
      } else {
        scriptHex += '4c';
        scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
      }
      scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Add data length and data
      const dataLength = chunkData.length;
      if (dataLength <= 75) {
        scriptHex += dataLength.toString(16).padStart(2, '0');
      } else if (dataLength <= 255) {
        scriptHex += '4c';
        scriptHex += dataLength.toString(16).padStart(2, '0');
      } else if (dataLength <= 65535) {
        scriptHex += '4d';
        scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
      } else {
        scriptHex += '4e';
        scriptHex += (dataLength & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((dataLength >> 8) & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((dataLength >> 16) & 0xff).toString(16).padStart(2, '0');
        scriptHex += ((dataLength >> 24) & 0xff).toString(16).padStart(2, '0');
      }
      
      // Add data in batches to avoid memory issues
      const BATCH_SIZE = 10000;
      for (let j = 0; j < chunkData.length; j += BATCH_SIZE) {
        const batch = chunkData.slice(j, Math.min(j + BATCH_SIZE, chunkData.length));
        scriptHex += Array.from(batch).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      
      const script = Script.fromHex(scriptHex);
      
      // 1. BCAT part output
      tx.addOutput({
        lockingScript: script,
        satoshis: 0
      });
      
      // 2. Application fee output
      tx.addOutput({
        lockingScript: new P2PKH().lock(APPLICATION_FEE_ADDRESSES[network]),
        satoshis: applicationFee
      });
      
      // 3. Change output
      const change = totalInput - minerFee - applicationFee;
      if (change > 546) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(address),
          satoshis: change
        });
      } else if (change > 0 && change < 546) {
        // Add dust to application fee
        tx.outputs[1].satoshis += change;
      }
      
      await tx.sign();
      const txHex = tx.toHex();
      const result = await broadcastService.broadcast(txHex);
      
      if (result.success && result.txid) {
        utxoManager.markAsSpent(selected);
        
        setChunkStates(prevStates => {
          const newStates = [...prevStates];
          newStates[chunkIndex] = { 
            ...newStates[chunkIndex], 
            status: 'success', 
            txid: result.txid,
            error: undefined
          };
          return newStates;
        });
        
        console.log(`✅ Chunk ${chunkIndex + 1} successfully uploaded: ${result.txid}`);
        return { success: true, txid: result.txid };
      } else {
        throw new Error(result.error || 'Broadcast failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setChunkStates(prevStates => {
        const newStates = [...prevStates];
        newStates[chunkIndex] = { 
          ...newStates[chunkIndex], 
          status: 'failed', 
          error: errorMessage
        };
        return newStates;
      });
      
      console.error(`❌ Chunk ${chunkIndex + 1} failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  };












  // Updated createLargeProfileOrdinal function
  const createLargeProfileOrdinal = async () => {
    if (!propertyData || !keyData.privateKey) {
      setStatus({ type: 'error', message: 'Missing required data' });
      return;
    }

    const successfulChunks = chunkStates.filter(state => state.status === 'success' && state.txid);
    if (successfulChunks.length !== chunkStates.length) {
      setStatus({ 
        type: 'error', 
        message: `Not all chunks uploaded. ${successfulChunks.length} of ${chunkStates.length} chunks complete.` 
      });
      return;
    }

    const timeSinceLastTx = Date.now() - lastTransactionTime;
    if (timeSinceLastTx < 5000) {
      setStatus({ 
        type: 'error', 
        message: `Please wait ${Math.ceil((5000 - timeSinceLastTx) / 1000)} seconds before creating another inscription`
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const chunkTxIds = chunkStates
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(state => state.txid!);
      
      setStatus({ type: 'info', message: 'Waiting for chunks to propagate...' });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setStatus({ type: 'info', message: 'Creating BCAT reference transaction...' });
      
      const utxoManager = new UTXOManager(keyData.address, network, whatsOnChainApiKey);
      const utxos = await utxoManager.fetchUTXOs(true);
      
      const privateKey = PrivateKey.fromWif(keyData.privateKeyWif) || PrivateKey.fromHex(keyData.privateKeyHex);
      const pubKeyHash = privateKey.toPublicKey().toHash();
      const address = privateKey.toPublicKey().toAddress();
      
      // Create metadata for the inscription
      const metadata = {
        title: propertyData.title || 'Untitled Property',
        description: propertyData.description || '',
        propertyName: propertyData.formData?.propertyName || '',
        type: 'property',
        encrypted: selectedEncryptionLevel > 0,
        encryptionLevel: selectedEncryptionLevel,
        chunks: chunkTxIds.length,
        created: new Date().toISOString()
      };
      
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
      const filename = `${(propertyData.title || 'property').substring(0, 30)}_property.bcat`;
      
      // Create inscription script
      const inscriptionScript = createInscriptionScript(
        pubKeyHash,
        'application/json',
        metadataBytes
      );





      
      // Calculate fees
      const opReturnSize = 1 + 1 + 35 + 1 + 10 + 1 + 24 + 1 + 1 + 50 + 1 + (chunkTxIds.length * 33);
      const estimatedTxSize = 300 + metadataBytes.length + opReturnSize;
      const minerFee = Math.ceil((estimatedTxSize / 1000) * currentFeeRate) + 100;
      const applicationFee = minerFee; // Application fee equals miner fee
      const totalRequired = 1 + minerFee + applicationFee + 546;
      
      const { selected, total } = utxoManager.selectUTXOs(totalRequired);
      
      if (selected.length === 0) {
        throw new Error(`Insufficient funds. Need ${totalRequired} sats (miner fee: ${minerFee}, app fee: ${applicationFee}), have ${total} sats`);
      }
      
      const tx = new Transaction();
      
      // Add inputs with proper sourceTransaction structure
      let totalInput = 0;
      for (const utxo of selected) {
        const txid = utxo.tx_hash || utxo.txid;
        const vout = utxo.tx_pos !== undefined ? utxo.tx_pos : (utxo.vout || 0);
        const satoshis = utxo.value || utxo.satoshis || 0;
        
        totalInput += satoshis;
        
        // Create properly structured sourceTransaction
        const sourceTransaction = {
          id: txid,
          version: 1,
          inputs: [],
          outputs: [],
          lockTime: 0
        };
        
        // Ensure outputs array is properly initialized
        for (let i = 0; i <= vout; i++) {
          sourceTransaction.outputs[i] = sourceTransaction.outputs[i] || {
            satoshis: i === vout ? satoshis : 0,
            lockingScript: new P2PKH().lock(address)
          };
        }
        
        tx.addInput({
          sourceTXID: txid,
          sourceOutputIndex: vout,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
          sourceTransaction: sourceTransaction
        });
      }
      
      // 1. Add inscription output
      tx.addOutput({
        lockingScript: inscriptionScript,
        satoshis: 1
      });
      
      // 2. Add application fee output
      tx.addOutput({
        lockingScript: new P2PKH().lock(APPLICATION_FEE_ADDRESSES[network]),
        satoshis: applicationFee
      });
      
      // 3. Create BCAT reference in OP_RETURN
      let scriptHex = '6a';
      


      // Add BCAT namespace
      const namespaceBytes = Utils.toArray(BCAT_NAMESPACE, 'utf8');
      scriptHex += namespaceBytes.length.toString(16).padStart(2, '0');
      scriptHex += namespaceBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Add info field
      const info = 'BCAT';
      const infoBytes = Utils.toArray(info, 'utf8');
      scriptHex += infoBytes.length.toString(16).padStart(2, '0');
      scriptHex += infoBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Add mime type
      const mimeType = 'application/json';
      const mimeBytes = Utils.toArray(mimeType.substring(0, 128), 'utf8');
      scriptHex += mimeBytes.length.toString(16).padStart(2, '0');
      scriptHex += mimeBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Add encoding (0x00 for binary)
      scriptHex += '00';
      
      // Add filename
      const filenameBytes = Utils.toArray(filename, 'utf8');
      scriptHex += filenameBytes.length.toString(16).padStart(2, '0');
      scriptHex += filenameBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Add flag (0x00)
      scriptHex += '00';
      
      // Add chunk transaction IDs (reversed for little-endian)
      for (const txid of chunkTxIds) {
        scriptHex += '20'; // 32 bytes for txid
        // Reverse the txid for little-endian format
        for (let i = txid.length - 2; i >= 0; i -= 2) {
          scriptHex += txid.substr(i, 2);
        }
      }
      
      const bcatScript = Script.fromHex(scriptHex);



      
      
      tx.addOutput({
        lockingScript: bcatScript,
        satoshis: 0
      });
      
      // 4. Add change output
      const change = totalInput - 1 - minerFee - applicationFee;
      
      if (change > 546) {
        tx.addOutput({
          lockingScript: new P2PKH().lock(address),
          satoshis: change
        });
      } else if (change > 0 && change < 546) {
        // Add dust to application fee
        tx.outputs[1].satoshis += change;
      }
      
      await tx.sign();
      const txHex = tx.toHex();
      
      const broadcastService = new BroadcastService(network, (message: string) => {
        setStatus({ 
          type: 'info', 
          message: `BCAT Reference TX: ${message}` 
        });
      });
      
      const result = await broadcastService.broadcast(txHex);
      
      if (result.success) {
        setLastTxid(result.txid!);
        setLastTransactionTime(Date.now());
        setLastBCATTxid(result.txid!);
        
        const successMessage = selectedEncryptionLevel > 0
          ? `🔒 Encrypted Property BCAT created successfully!\nMain TX: ${result.txid}\nProperty: "${propertyData.title || 'Property'}"\nEncryption Level: ${selectedEncryptionLevel}\nChunks: ${chunkTxIds.length}`
          : `Property BCAT created successfully!\nMain TX: ${result.txid}\nProperty: "${propertyData.title || 'Property'}"\nChunks: ${chunkTxIds.length}`;
        
        setStatus({ 
          type: 'success', 
          message: successMessage 
        });
        
        // Clear the success message after 30 seconds
        setTimeout(() => {
          setLastBCATTxid('');
        }, 30000);
        
        // Clear state
        setPropertyData(null);
        setChunkStates([]);
        setSelectedEncryptionLevel(0);
      } else {
        throw new Error(result.error || 'Failed to broadcast BCAT transaction');
      }
      
    } catch (error) {
      console.error('Error creating BCAT inscription:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create BCAT inscription' 
      });
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component remains the same
  const allChunksComplete = getAllChunksComplete();

  return (
    // ... keep all existing JSX unchanged
  );
};