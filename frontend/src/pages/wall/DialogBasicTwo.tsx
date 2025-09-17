import React, { useState, useMemo, useEffect } from 'react';
import { Utils } from '@bsv/sdk';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogContainer,
} from '../../components/ui/dialog3';
import PropertyViewer from './sheet5';

// BCAT part namespace  button
const BCAT_PART_NAMESPACE = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL';
const BCAT_NAMESPACE = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up';

interface DialogBasicTwoProps {
  post: any;
  index: number;
  network: 'mainnet' | 'testnet';
  whatsOnChainApiKey?: string;
}

const DialogBasicTwo: React.FC<DialogBasicTwoProps> = ({ post, index, network, whatsOnChainApiKey }) => {
  const [expandedReviewIds, setExpandedReviewIds] = useState<string[]>([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [reconstructing, setReconstructing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string>('');
  const [reconstructedContent, setReconstructedContent] = useState<string>('');
  const [rawData, setRawData] = useState<Uint8Array | null>(null);
  const [autoReconstruct, setAutoReconstruct] = useState(false);
  const [bcatMetadata, setBcatMetadata] = useState<any>(null);
  const [chunkTxIds, setChunkTxIds] = useState<string[]>([]);

  // Parse BCAT data from scriptPubKey.hex
  const parseBCATFromScript = (post: any) => {
    try {
      // Check if post has rawTransaction with scriptPubKey
      const rawTx = post.rawTransaction || post;
      if (!rawTx.vout) return null;

      // Find OP_RETURN output
      const opReturnOutput = rawTx.vout?.find((out: any) => 
        out.scriptPubKey?.hex?.startsWith('6a') || // OP_RETURN
        out.scriptPubKey?.asm?.startsWith('OP_RETURN')
      );

      if (!opReturnOutput) return null;

      const scriptHex = opReturnOutput.scriptPubKey.hex;
      if (!scriptHex) return null;

      // Parse OP_RETURN data
      let offset = 2; // Skip OP_RETURN (6a)
      const chunks: string[] = [];
      let bcatData: any = null;
      let foundBCAT = false;

      while (offset < scriptHex.length) {
        if (offset + 2 > scriptHex.length) break;

        // Read push opcode
        const pushOpcode = parseInt(scriptHex.substr(offset, 2), 16);
        offset += 2;

        let dataLength = 0;
        if (pushOpcode <= 75) {
          dataLength = pushOpcode;
        } else if (pushOpcode === 0x4c && offset + 2 <= scriptHex.length) {
          dataLength = parseInt(scriptHex.substr(offset, 2), 16);
          offset += 2;
        } else if (pushOpcode === 0x4d && offset + 4 <= scriptHex.length) {
          dataLength = parseInt(scriptHex.substr(offset, 2), 16) + 
                      (parseInt(scriptHex.substr(offset + 2, 2), 16) << 8);
          offset += 4;
        }

        if (offset + dataLength * 2 > scriptHex.length) break;

        const dataHex = scriptHex.substr(offset, dataLength * 2);
        offset += dataLength * 2;

        // Try to decode as string
        let dataStr = '';
        try {
          for (let i = 0; i < dataHex.length; i += 2) {
            dataStr += String.fromCharCode(parseInt(dataHex.substr(i, 2), 16));
          }
        } catch (e) {
          // Not a string, might be binary data
        }

        // Check if this is BCAT namespace
        if (dataStr === BCAT_NAMESPACE) {
          foundBCAT = true;
          continue;
        }

        // If we found BCAT, next chunks should be metadata
        if (foundBCAT && !bcatData) {
          // Try to parse as JSON (the inscription metadata)
          try {
            bcatData = JSON.parse(dataStr);
          } catch (e) {
            // Might be other BCAT fields
          }
        }

        // Check if this looks like a transaction ID (64 hex chars)
        if (dataHex.length === 64) {
          // Reverse for txid (little-endian to big-endian)
          let txid = '';
          for (let i = dataHex.length - 2; i >= 0; i -= 2) {
            txid += dataHex.substr(i, 2);
          }
          chunks.push(txid);
        }
      }

      if (foundBCAT && (bcatData || chunks.length > 0)) {
        return {
          metadata: bcatData,
          chunkTxIds: chunks
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing BCAT from script:', error);
      return null;
    }
  };

  // Check if this is a BCAT property post
  const isBCATProperty = useMemo(() => {
    // First check standard fields
    if (post.inscriptionType === 'bcat' || 
        post.content?.protocol === 'bcat' ||
        (post.content?.chunks && Array.isArray(post.content?.chunks))) {
      return true;
    }

    // Try to parse from script
    const bcatInfo = parseBCATFromScript(post);
    if (bcatInfo) {
      setBcatMetadata(bcatInfo.metadata);
      setChunkTxIds(bcatInfo.chunkTxIds);
      return true;
    }

    return false;
  }, [post]);

  // Parse BCAT metadata
  useEffect(() => {
    if (isBCATProperty && !bcatMetadata) {
      const content = post.content || {};
      
      // Check if we already have metadata from content
      if (content.chunks || content.title) {
        setBcatMetadata({
          filename: content.filename || content.name || 'property_data',
          mimeType: content.mimeType || content.type || 'application/json',
          charset: content.charset || null,
          flag: content.flag || null,
          info: content.info || '',
          chunks: content.chunks?.length || content.chunks || 0,
          title: content.title,
          description: content.description,
          propertyName: content.propertyName,
          type: content.type
        });
        
        if (content.chunks && Array.isArray(content.chunks)) {
          setChunkTxIds(content.chunks);
        }
      }
    }
  }, [isBCATProperty, post, bcatMetadata]);

  // Auto-reconstruct on mount if enabled
  useEffect(() => {
    if (autoReconstruct && isBCATProperty && !reconstructedContent && chunkTxIds.length > 0) {
      reconstructFile();
    }
  }, [autoReconstruct, isBCATProperty, chunkTxIds]);

  const toggleReadMore = (id: string) => {
    setExpandedReviewIds((prevIds) =>
      prevIds.includes(id) ? prevIds.filter((reviewId) => reviewId !== id) : [...prevIds, id]
    );
  };

  const preventClose = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Convert namespace to hex for comparison
  const namespaceToHex = (namespace: string): string => {
    return Utils.toArray(namespace, 'utf8').map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const BCAT_PART_NAMESPACE_HEX = namespaceToHex(BCAT_PART_NAMESPACE);

  // Extract chunk data from BCAT part transaction
  const extractChunkData = async (txid: string, chunkIndex: number): Promise<Uint8Array> => {
    try {
      const headers: any = {};
      if (whatsOnChainApiKey) {
        headers['woc-api-key'] = whatsOnChainApiKey;
      }

      console.log(`Fetching chunk ${chunkIndex + 1} from TX: ${txid}`);
      
      const txResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/tx/hash/${txid}`,
        { headers }
      );

      if (!txResponse.ok) {
        throw new Error(`Failed to fetch chunk transaction ${chunkIndex + 1}`);
      }

      const txData = await txResponse.json();
      
      const opReturnOutput = txData.vout.find((out: any) => {
        return out.value === 0 && out.scriptPubKey?.asm?.startsWith('OP_RETURN');
      });
      
      if (!opReturnOutput) {
        throw new Error(`No OP_RETURN found in chunk ${chunkIndex + 1}`);
      }

      const scriptHex = opReturnOutput.scriptPubKey.hex;
      
      // Manual hex parsing to extract BCAT data
      let pos = 2; // Skip OP_RETURN
      let foundNamespace = false;
      let dataHex = '';
      
      while (pos < scriptHex.length) {
        if (pos + 2 > scriptHex.length) break;
        
        const opcode = parseInt(scriptHex.substr(pos, 2), 16);
        let dataLength = 0;
        let dataStart = pos;
        
        if (opcode <= 75) {
          dataLength = opcode;
          dataStart = pos + 2;
        } else if (opcode === 0x4c && pos + 4 <= scriptHex.length) {
          dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16);
          dataStart = pos + 4;
        } else if (opcode === 0x4d && pos + 6 <= scriptHex.length) {
          dataLength = parseInt(scriptHex.substr(pos + 2, 2), 16) + 
                       (parseInt(scriptHex.substr(pos + 4, 2), 16) << 8);
          dataStart = pos + 6;
        }
        
        if (dataStart + dataLength * 2 > scriptHex.length) break;
        
        const currentDataHex = scriptHex.substr(dataStart, dataLength * 2);
        
        if (!foundNamespace) {
          let dataAsString = '';
          try {
            for (let i = 0; i < currentDataHex.length; i += 2) {
              dataAsString += String.fromCharCode(parseInt(currentDataHex.substr(i, 2), 16));
            }
          } catch (e) {
            // Not a string
          }
          
          if (currentDataHex === BCAT_PART_NAMESPACE_HEX || dataAsString === BCAT_PART_NAMESPACE) {
            foundNamespace = true;
          }
        } else if (!dataHex) {
          dataHex = currentDataHex;
          break;
        }
        
        pos = dataStart + dataLength * 2;
      }
      
      if (!foundNamespace || !dataHex) {
        throw new Error(`Failed to extract data from chunk ${chunkIndex + 1}`);
      }
      
      const data = new Uint8Array(dataHex.length / 2);
      for (let i = 0; i < dataHex.length; i += 2) {
        data[i / 2] = parseInt(dataHex.substr(i, 2), 16);
      }
      
      return data;
      
    } catch (error) {
      console.error(`Error extracting chunk ${chunkIndex + 1}:`, error);
      throw error;
    }
  };

  // Parse property data from reconstructed BCAT content
  function parsePropertyData(data: Uint8Array): { json: any; images: Map<string, Uint8Array> } {
    const images = new Map<string, Uint8Array>();
    let jsonData: any = null;
    
    try {
      let offset = 0;
      
      // First, try to read JSON size (4 bytes)
      if (offset + 4 <= data.length) {
        const jsonSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
        offset += 4;
        
        // Read JSON data
        if (offset + jsonSize <= data.length) {
          const jsonBytes = data.slice(offset, offset + jsonSize);
          const jsonText = new TextDecoder().decode(jsonBytes);
          try {
            jsonData = JSON.parse(jsonText);
            offset += jsonSize;
          } catch (e) {
            console.log('Failed to parse JSON at expected position');
            offset = 0;
          }
        }
      }
      
      // If standard parsing failed, try to find JSON in the data
      if (!jsonData) {
        const textData = new TextDecoder().decode(data);
        const jsonMatch = textData.match(/\{[\s\S]*?\}(?=([A-Z]|$))/);
        if (jsonMatch) {
          try {
            jsonData = JSON.parse(jsonMatch[0]);
            const jsonEndIndex = new TextEncoder().encode(jsonMatch[0]).length;
            offset = jsonEndIndex;
          } catch (e) {
            console.log('Alternative JSON parsing failed');
          }
        }
      }
      
      // Try to extract images if we have remaining data
      while (offset < data.length - 8) {
        try {
          // Read label size (4 bytes)
          const labelSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
          offset += 4;
          
          if (labelSize > 1000 || offset + labelSize > data.length) break;
          
          // Read label
          const labelBytes = data.slice(offset, offset + labelSize);
          const label = new TextDecoder().decode(labelBytes);
          offset += labelSize;
          
          if (offset + 4 > data.length) break;
          
          // Read image size (4 bytes)
          const imageSize = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
          offset += 4;
          
          if (imageSize > data.length - offset) break;
          
          // Read image data
          const imageData = data.slice(offset, offset + imageSize);
          offset += imageSize;
          
          images.set(label, imageData);
          console.log(`Extracted image: ${label}, size: ${imageSize} bytes`);
        } catch (e) {
          console.log('Error extracting image');
          break;
        }
      }
      
      // If we still don't have JSON, try parsing the entire thing as JSON
      if (!jsonData) {
        try {
          const fullText = new TextDecoder().decode(data);
          jsonData = JSON.parse(fullText);
        } catch (e) {
          console.log('Could not parse as pure JSON');
        }
      }
      
    } catch (error) {
      console.error('Error parsing property data:', error);
    }
    
    return { json: jsonData, images };
  }

  // Reconstruct BCAT file from chunks
  const reconstructFile = async () => {
    if (!chunkTxIds || chunkTxIds.length === 0) {
      setError('No chunk transactions to reconstruct');
      return;
    }
    
    setReconstructing(true);
    setProgress({ current: 0, total: chunkTxIds.length });
    setError('');
    setReconstructedContent('');
    setRawData(null);
    
    try {
      const chunks: Uint8Array[] = [];
      
      for (let i = 0; i < chunkTxIds.length; i++) {
        setProgress({ current: i + 1, total: chunkTxIds.length });
        
        const chunkData = await extractChunkData(chunkTxIds[i], i);
        chunks.push(chunkData);
        
        if (i < chunkTxIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      console.log(`Reconstructed file: ${totalLength} bytes`);
      setRawData(combined);
      
      // Check if this is property data
      const filename = bcatMetadata?.filename || '';
      const looksLikeProperty = bcatMetadata?.type === 'property' ||
                               filename.toLowerCase().includes('property') || 
                               filename.toLowerCase().includes('title_prop');
      
      // Try to decode and enhance property data
      if (looksLikeProperty || bcatMetadata?.type === 'property') {
        const { json, images } = parsePropertyData(combined);
        if (json) {
          // Create enhanced content for PropertyViewer
          const enhancedContent = {
            ...json,
            _embeddedImages: {}
          };
          
          // Convert images to base64 URLs
          images.forEach((imageData, label) => {
            const base64 = btoa(String.fromCharCode(...imageData));
            enhancedContent._embeddedImages[label] = `data:image/jpeg;base64,${base64}`;
          });
          
          // Add metadata from BCAT
          if (bcatMetadata) {
            enhancedContent.title = enhancedContent.title || bcatMetadata.title;
            enhancedContent.description = enhancedContent.description || bcatMetadata.description;
            enhancedContent.propertyName = enhancedContent.propertyName || bcatMetadata.propertyName;
          }
          
          setReconstructedContent(JSON.stringify(enhancedContent));
        } else {
          // Fallback to text
          const text = new TextDecoder().decode(combined);
          setReconstructedContent(text);
        }
      } else {
        // Try to decode as text for non-property data
        try {
          const text = new TextDecoder().decode(combined);
          setReconstructedContent(text);
        } catch (e) {
          console.log('Cannot decode as text');
        }
      }
      
      setError('');
    } catch (error) {
      console.error('Error reconstructing file:', error);
      setError(error instanceof Error ? error.message : 'Failed to reconstruct file');
    } finally {
      setReconstructing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const formatReviewContent = (content: string, expanded: boolean, toggleReadMore: () => void) => {
    const maxLength = 140;
    if (expanded || content.length <= maxLength) {
      return content;
    }
    const shortContent = content.slice(0, maxLength);
    return (
      <>
        {shortContent}...{' '}
        <button onClick={toggleReadMore} className="text-blue-500 hover:underline">
          read more
        </button>
      </>
    );
  };

  // Download functions
  const downloadJSON = () => {
    const transactionData = post.rawTransaction || {
      txid: post.txid,
      inscriptionType: post.inscriptionType,
      content: {
        title: post.title,
        content: post.content,
        type: post.type,
        image: post.imageUrl,
        timestamp: post.date
      },
      metadata: {
        size: post.size,
        encrypted: post.encrypted,
        encryptionLevel: post.encryptionLevel,
        user: post.user,
        vout: post.vout,
        isWallt4: post.isWallt4
      }
    };

    const jsonString = JSON.stringify(transactionData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tx_${post.txid.substring(0, 8)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const csvContent = `Transaction ID,Title,Content,Type,User,Date,Size,Encrypted,Wallt4,InscriptionType
"${post.txid}","${post.title}","${post.content.replace(/"/g, '""')}","${post.type}","${post.user}","${post.createdAt}",${post.size},${post.encrypted},${post.isWallt4},${post.inscriptionType}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tx_${post.txid.substring(0, 8)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadTXT = () => {
    const textContent = `TRANSACTION DETAILS
==================
Transaction ID: ${post.txid}
Title: ${post.title}
Content: ${post.content}
Type: ${post.type}
User: ${post.user}
Date: ${post.createdAt}
Size: ${post.size} bytes
Encrypted: ${post.encrypted}
Encryption Level: ${post.encryptionLevel}
Wallt4 Post: ${post.isWallt4 ? 'Yes' : 'No'}
Inscription Type: ${post.inscriptionType}

Blockchain URL: https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${post.txid}`;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tx_${post.txid.substring(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // If this is a BCAT property and we have reconstructed content, show PropertyViewer
  if (isBCATProperty && reconstructedContent) {
    return <PropertyViewer content={reconstructedContent} />;
  }

  // Regular post display (non-BCAT or not yet reconstructed)
  // Show metadata if it's a BCAT but not yet reconstructed
  const displayTitle = bcatMetadata?.title || post.title;
  const displayContent = bcatMetadata?.description || post.content;
  const displayType = bcatMetadata?.type || post.type;

  return (
    <Dialog
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 24,
      }}
    >
      <DialogTrigger
        style={{
          borderRadius: '4px',
        }}
        className="p-2 cursor-pointer"
      >
        <div className="flex flex-col bg-gray-900 text-white rounded-lg border border-gray-700 p-3 relative">
          {/* Badges */}
          {(post.isWallt4 || post.inscriptionType === 'wallt4') && (
            <div className="absolute top-2 left-2 z-10">
              <span className="text-xs px-2 py-1 rounded bg-purple-600 text-white">
                W4
              </span>
            </div>
          )}
          
          {isBCATProperty && (
            <div className="absolute top-2 left-14 z-10">
              <span className="text-xs px-2 py-1 rounded bg-blue-600 text-white">
                BCAT
              </span>
            </div>
          )}
          
          {post.encrypted && (
            <div className="absolute top-2 right-2 z-10">
              <span className={`text-xs px-2 py-1 rounded bg-opacity-75 ${
                post.encryptionLevel === 5 ? 'bg-red-600' :
                post.encryptionLevel === 4 ? 'bg-purple-600' :
                post.encryptionLevel === 3 ? 'bg-indigo-600' :
                post.encryptionLevel === 2 ? 'bg-yellow-600' :
                post.encryptionLevel === 1 ? 'bg-amber-600' :
                'bg-gray-600'
              } text-white`}>
                🔒 L{post.encryptionLevel}
              </span>
            </div>
          )}

          <div className="flex flex-row">
            <div className="border border-grey-700 pt-2 pl-2 relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden">
              <img
                src={post.imageUrl}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 flex flex-col ml-4 space-y-3">
              <div className="flex items-center space-x-3">
                <p className="text-lg font-semibold truncate">{displayTitle}</p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="font-semibold">{post.user.substring(0, 8)}...{post.user.substring(post.user.length - 6)}</div>
                <div>{post.createdAt}</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="rounded w-full">
              {formatReviewContent(displayContent, expandedReviewIds.includes(post.id), () => toggleReadMore(post.id))}
            </p>
          </div>

          {/* BCAT Reconstruction Section */}
          {isBCATProperty && !reconstructedContent && (
            <div className="mt-3 border-t border-gray-700 pt-3">
              {bcatMetadata && (
                <div className="mb-2 text-xs text-gray-400">
                  <p>Property: {bcatMetadata.propertyName || 'Unknown'}</p>
                  <p>Chunks: {bcatMetadata.chunks || chunkTxIds.length || 'Unknown'}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reconstructFile();
                  }}
                  disabled={reconstructing}
                  className="px-3 py-1 bg-red-500 hover:bg-blue-600 text-white text-xs rounded transition-colors disabled:opacity-50 flex-1 mr-2"
                >
                  {reconstructing ? `Reconstructing... ${progress.current}/${progress.total}` : '🔨 Reconstruct Property'}
                </button>
                
                <label className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    checked={autoReconstruct}
                    onChange={(e) => setAutoReconstruct(e.target.checked)}
                    className="mr-1"
                  />
                  Auto
                </label>
              </div>

              {/* Progress bar */}
              {reconstructing && progress.total > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div 
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="mt-2 text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogTrigger>

      <DialogContainer>
        <DialogContent
          style={{
            borderRadius: '12px',
          }}
          className="relative h-auto w-[500px] border border-gray-100 bg-white"
          onClick={preventClose}
          onMouseDown={preventClose}
        >
          {/* Full view content */}
          <div className="flex font-sans">
            <div className="flex-none w-48 relative">
              <img 
                src={post.imageUrl}
                alt={displayTitle} 
                className="pt-2 pl-2 absolute inset-0 w-full h-full object-cover border border-grey-700" 
                loading="lazy" 
              />
            </div>
            <div className="flex-auto p-6">
              <div className="flex flex-wrap">
                <h1 className="flex-auto text-lg font-semibold text-slate-900">
                  {displayTitle}
                </h1>
                <div className="text-lg font-semibold text-slate-500">
                  {post.user.substring(0, 12)}...
                </div>
                <div className="w-full flex-none text-sm font-medium text-slate-700 mt-2">
                  {displayType} • {post.createdAt}
                  {(post.isWallt4 || post.inscriptionType === 'wallt4') && 
                    <span className="ml-2 text-xs text-purple-600">• Wallt4</span>}
                  {isBCATProperty && 
                    <span className="ml-2 text-xs text-blue-600">• BCAT Property</span>}
                </div>
              </div>
            </div>
          </div>

          {/* BCAT specific content */}
          {isBCATProperty && bcatMetadata && (
            <div className="px-6 pb-4 space-y-3">
              <div className="bg-gray-100 rounded p-3">
                <h3 className="text-sm font-medium text-gray-700 mb-2">BCAT Property Details</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Property:</span>
                    <p className="text-gray-800">{bcatMetadata.propertyName || bcatMetadata.title || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="text-gray-800">{bcatMetadata.type || 'property'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Chunks:</span>
                    <p className="text-gray-800">{bcatMetadata.chunks || chunkTxIds.length || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="text-gray-800">{bcatMetadata.created || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              {/* Reconstruction button */}
              {!reconstructedContent && (
                <button
                  onClick={reconstructFile}
                  disabled={reconstructing}
                  className="w-full px-4 py-2 bg-red-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50"
                >
                  {reconstructing ? `Reconstructing... ${progress.current}/${progress.total}` : '🔨 Reconstruct Property Data'}
                </button>
              )}

              {/* Progress bar */}
              {reconstructing && progress.total > 0 && (
                <div className="bg-gray-100 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">
                    Processing chunk {progress.current} of {progress.total}
                  </p>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>
                </div>
              )}

              {/* Reconstructed content preview */}
              {reconstructedContent && (
                <div className="bg-gray-100 rounded p-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Preview</h4>
                  <div className="bg-white rounded p-2 max-h-48 overflow-y-auto">
                    <pre className="text-gray-700 text-xs whitespace-pre-wrap">
                      {reconstructedContent.substring(0, 500)}
                      {reconstructedContent.length > 500 && '...'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Chunk list */}
              {chunkTxIds.length > 0 && (
                <details className="bg-gray-100 rounded p-3">
                  <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
                    View Chunk Transactions ({chunkTxIds.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {chunkTxIds.map((txid, index) => (
                      <div key={txid} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Chunk {index + 1}:</span>
                        <a
                          href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400 font-mono"
                        >
                          {txid.substring(0, 16)}...{txid.substring(txid.length - 8)}
                        </a>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Regular post content */}
          {!isBCATProperty && (
            <div className="p-6 space-y-4 text-gray-700">
              <div
                className="max-h-[300px] overflow-auto p-2 border border-gray-200 rounded"
                style={{
                  wordBreak: 'break-word',
                }}
              >
                <p className="text-base">{displayContent}</p>
              </div>
            </div>
          )}

          <div className="px-6 pb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs text-gray-500">
                <a
                  href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${post.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400"
                >
                  View on blockchain →
                </a>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                >
                  📥 Download ▼
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50">
                                   <button
                  onClick={reconstructFile}
                  disabled={reconstructing}
                  className="w-full px-4 py-2 bg-red-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50"
                >
                  {reconstructing ? `Reconstructing... ${progress.current}/${progress.total}` : '🔨 Reconstruct Property Data'}
                </button>
                    <button
                      onClick={() => { downloadJSON(); setShowDownloadMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-100"
                    >
                      📄 JSON Format
                    </button>
                    <button
                      onClick={() => { downloadCSV(); setShowDownloadMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-100"
                    >
                      📊 CSV Format
                    </button>
                    <button
                      onClick={() => { downloadTXT(); setShowDownloadMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-gray-100"
                    >
                      📝 Text Format
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogClose className='absolute top-1 right-3 text-black hover:text-red-500 transition-transform hover:scale-125 text-2xl'>
            &times;
          </DialogClose>
        </DialogContent>
      </DialogContainer>
    </Dialog>
  );
};

export default DialogBasicTwo;