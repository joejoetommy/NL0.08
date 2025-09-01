import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../../store/WalletStore';
import { CreateTextInscription } from './CreateTextInscription';
import { CreateImageInscription } from './CreateImageInscription';
import { CreateProfileInscription } from './CreateProfileInscription';
import { CreateProfile2Inscription } from './CreateProfile2Inscription';
import { CreateLargeProfileInscription } from './CreateLargeProfileInscription';
// import { CreateLargeProfileInscription1 } from './CreateLargeProfileInscription1';
import { BCATManager } from './BCATComponent';
import { InscriptionTypeSelector } from './InscriptionTypeSelector';
import { EncryptionOptions } from './EncryptionOptions';
import { TransactionStatus } from './TransactionStatus';
import { WalletInfo } from './WalletInfo';
import { BlogEncryption, EncryptionLevel, getEncryptionLevelColor, getEncryptionLevelLabel } from  '../utils/BlogEncryption';
import { createInscription } from '../utils/inscriptionCreator';

interface CreateInscriptionProps {
  network: 'mainnet' | 'testnet';
}
//   InscriptionTypeSelectorProps Inscription Type      
export const CreateInscription: React.FC<CreateInscriptionProps> = ({ network }) => {
  const [inscriptionType, setInscriptionType] = useState<'text' | 'image' | 'profile' | 'profile2' | 'largeProfile' | 'largeProfile2'>('text');
  const [textData, setTextData] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [profileData, setProfileData] = useState({
    username: '',
    title: '',
    bio: '',
    avatar: ''
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastTransactionTime, setLastTransactionTime] = useState(0);
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
    type: null, 
    message: '' 
  });
  const [lastTxid, setLastTxid] = useState('');
  const [encryptionLevel, setEncryptionLevel] = useState<EncryptionLevel>(0);
  const [showEncryptionOptions, setShowEncryptionOptions] = useState(false);
  const [encryptedData, setEncryptedData] = useState<string>('');
  const [encryptedSize, setEncryptedSize] = useState<number>(0);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const { keyData, balance, whatsOnChainApiKey, blogKeyHistory, getKeySegmentForLevel } = useWalletStore();

  // Fetch current fee rate from the network
  const fetchCurrentFeeRate = async () => {
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
        setCurrentFeeRate(actualRate);
        console.log(`Current network fee rate: ${actualRate} sat/KB`);
        return actualRate;
      }
    } catch (error) {
      console.log('Could not fetch fee rate, using default BSV rate');
    }
    
    const defaultRate = 1;
    setCurrentFeeRate(defaultRate);
    console.log(`Using default BSV fee rate: ${defaultRate} sat/KB`);
    return defaultRate;
  };

  // Fetch fee rate on component mount and network change
  useEffect(() => {
    fetchCurrentFeeRate();
  }, [network]);

  // Auto-encrypt data when inputs or encryption level change
  useEffect(() => {
    if (encryptionLevel > 0 && blogKeyHistory.current && inscriptionType !== 'largeProfile' && inscriptionType !== 'largeProfile2') {
      encryptCurrentData();
    } else {
      setEncryptedData('');
      setEncryptedSize(0);
    }
  }, [textData, imageFile, profileData, profileImageFile, backgroundImageFile, encryptionLevel, inscriptionType]);

  // Encrypt current data based on inscription type
  const encryptCurrentData = async () => {
    if (!blogKeyHistory.current || encryptionLevel === 0) {
      setEncryptedData('');
      setEncryptedSize(0);
      return;
    }

    setIsEncrypting(true);
    
    try {
      const keySegment = getKeySegmentForLevel(encryptionLevel);
      if (!keySegment) {
        throw new Error('No key segment available for encryption level');
      }

      let dataToEncrypt: any;
      let contentType = '';

      // Prepare data based on inscription type
      if (inscriptionType === 'text') {
        if (!textData) {
          setEncryptedData('');
          setEncryptedSize(0);
          setIsEncrypting(false);
          return;
        }
        dataToEncrypt = textData;
        contentType = 'text';
      } else if (inscriptionType === 'image' && imageFile) {
        // Handle image encryption
        const { imageToBase64 } = await import('../utils/imageUtils');
        const base64Data = await imageToBase64(imageFile, undefined, true, undefined, 'image');
        dataToEncrypt = {
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size,
          data: base64Data
        };
        contentType = 'image';
      } else if (inscriptionType === 'profile' || inscriptionType === 'profile2' || inscriptionType === 'profile4') {
        // Handle profile encryption
        const { imageToBase64 } = await import('../utils/imageUtils');
        const profileDataToSave: any = {
          p: inscriptionType,
          username: profileData.username || 'Anonymous',
          title: profileData.title || 'BSV User',
          bio: profileData.bio || 'On-chain profile',
          timestamp: Date.now()
        };
        
        if (profileImageFile) {
          const targetSize = inscriptionType === 'profile' ? undefined : undefined; // Let imageToBase64 handle limits
          const base64Data = await imageToBase64(profileImageFile, undefined, true, targetSize, inscriptionType);
          profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
        }
        
        if ((inscriptionType === 'profile2' || inscriptionType === 'profile4') && backgroundImageFile) {
          const base64Data = await imageToBase64(backgroundImageFile, undefined, true, undefined, inscriptionType);
          profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
        }
        
        dataToEncrypt = profileDataToSave;
        contentType = inscriptionType;
      } else {
        setEncryptedData('');
        setEncryptedSize(0);
        setIsEncrypting(false);
        return;
      }

      // Encrypt the data
      const { encryptedData, metadata } = await BlogEncryption.prepareEncryptedInscription(
        dataToEncrypt,
        encryptionLevel,
        keySegment
      );
      
      // Create the wrapper
      const wrapper = {
        encrypted: true,
        originalType: contentType,
        data: encryptedData,
        metadata
      };
      
      const encryptedJson = JSON.stringify(wrapper);
      const encryptedSizeBytes = new TextEncoder().encode(encryptedJson).length;
      
      setEncryptedData(encryptedJson);
      setEncryptedSize(encryptedSizeBytes);
      
    } catch (error) {
      console.error('Encryption error:', error);
      setStatus({ 
        type: 'error', 
        message: 'Failed to encrypt data: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      setEncryptedData('');
      setEncryptedSize(0);
    } finally {
      setIsEncrypting(false);
    }
  };

  // Handle creating inscription
  const handleCreateInscription = async () => {
    try {
      setLoading(true);
      setStatus({ type: 'info', message: 'Preparing inscription...' });
      
      const result = await createInscription({
        inscriptionType,
        textData,
        imageFile,
        profileData,
        profileImageFile,
        backgroundImageFile,
        encryptionLevel,
        encryptedData,
        keyData,
        network,
        whatsOnChainApiKey,
        blogKeyHistory,
        currentFeeRate,
        lastTransactionTime
      });

      if (result.success) {
        setLastTxid(result.txid!);
        setLastTransactionTime(Date.now());
        setStatus({ 
          type: 'success', 
          message: result.message 
        });
        
        // Reset form
        setTextData('');
        setImageFile(null);
        setImagePreview('');
        setProfileData({ username: '', title: '', bio: '', avatar: '' });
        setProfileImageFile(null);
        setProfileImagePreview('');
        setBackgroundImageFile(null);
        setBackgroundImagePreview('');
        setEncryptedData('');
        setEncryptedSize(0);
      } else {
        setStatus({ 
          type: 'error', 
          message: result.error || 'Failed to create inscription' 
        });
      }
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create inscription' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
        <h2 className="text-xl font-semibold text-white">Create Inscription</h2>
        <p className="text-sm text-gray-300 mt-1">Create text, image, or profile inscriptions on BSV</p>
      </div>

      <TransactionStatus 
        status={status} 
        lastTxid={lastTxid} 
        network={network}
        lastTransactionTime={lastTransactionTime}
      />

      <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
        <div className="space-y-4">
          <InscriptionTypeSelector 
            inscriptionType={inscriptionType}
            setInscriptionType={setInscriptionType}
          />

          {/* Show encryption options for all types except largeProfile and largeProfile2   */}
          {inscriptionType !== 'largeProfile' && inscriptionType !== 'largeProfile2' && (
            <EncryptionOptions
              encryptionLevel={encryptionLevel}
              setEncryptionLevel={setEncryptionLevel}
              showEncryptionOptions={showEncryptionOptions}
              setShowEncryptionOptions={setShowEncryptionOptions}
              blogKeyHistory={blogKeyHistory}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Left Side - Original Data Input */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Original Data</h3>
              
              {inscriptionType === 'text' && (
                <CreateTextInscription
                  textData={textData}
                  setTextData={setTextData}
                />
              )}

              {inscriptionType === 'image' && (
                <CreateImageInscription
                  imageFile={imageFile}
                  setImageFile={setImageFile}
                  imagePreview={imagePreview}
                  setImagePreview={setImagePreview}
                  setStatus={setStatus}
                  currentFeeRate={currentFeeRate}
                  encryptionLevel={encryptionLevel}
                />
              )}

              {inscriptionType === 'profile' && (
                <CreateProfileInscription
                  profileData={profileData}
                  setProfileData={setProfileData}
                  profileImageFile={profileImageFile}
                  setProfileImageFile={setProfileImageFile}
                  profileImagePreview={profileImagePreview}
                  setProfileImagePreview={setProfileImagePreview}
                  setStatus={setStatus}
                />
              )}

              {inscriptionType === 'profile2' && (
                <CreateProfile2Inscription
                  profileData={profileData}
                  setProfileData={setProfileData}
                  profileImageFile={profileImageFile}
                  setProfileImageFile={setProfileImageFile}
                  profileImagePreview={profileImagePreview}
                  setProfileImagePreview={setProfileImagePreview}
                  backgroundImageFile={backgroundImageFile}
                  setBackgroundImageFile={setBackgroundImageFile}
                  backgroundImagePreview={backgroundImagePreview}
                  setBackgroundImagePreview={setBackgroundImagePreview}
                  setStatus={setStatus}
                />
              )}


              {inscriptionType === 'largeProfile' && (
                <CreateLargeProfileInscription
                  keyData={keyData}
                  network={network}
                  whatsOnChainApiKey={whatsOnChainApiKey}
                  currentFeeRate={currentFeeRate}
                  balance={balance}
                  lastTransactionTime={lastTransactionTime}
                  setStatus={setStatus}
                  setLastTxid={setLastTxid}
                  setLastTransactionTime={setLastTransactionTime}
                />
              )}

              {inscriptionType === 'largeProfile2' && (
                <BCATManager
                  // BCATManager
                  keyData={keyData}
                  network={network}
              //  whatsOnChainApiKey={whatsOnChainApiKey}
                  currentFeeRate={currentFeeRate}
                  balance={balance}
                  lastTransactionTime={lastTransactionTime}
                  setStatus={setStatus}
                  setLastTxid={setLastTxid}
                  setLastTransactionTime={setLastTransactionTime}
                />
              //  <CreateLargeProfileInscription1
              //     keyData={keyData}
              //     network={network}
              //     whatsOnChainApiKey={whatsOnChainApiKey}
              //     currentFeeRate={currentFeeRate}
              //     balance={balance}
              //     lastTransactionTime={lastTransactionTime}
              //     setStatus={setStatus}
              //     setLastTxid={setLastTxid}
              //     setLastTransactionTime={setLastTransactionTime}
              //   />
              )}

              {inscriptionType !== 'largeProfile' && inscriptionType !== 'largeProfile2' && (
                <>
                  <WalletInfo 
                    keyData={keyData}
                    balance={balance}
                    blogKeyHistory={blogKeyHistory}
                  />

                  {/* Create Button (shows for both encrypted and non-encrypted) */}
                  <button
                    onClick={handleCreateInscription}
                    disabled={loading || !keyData.privateKey || balance.confirmed < 500 || 
                      (inscriptionType === 'image' && !imageFile) ||
                      ((inscriptionType === 'profile2' || inscriptionType === 'profile4') && !profileImageFile && !backgroundImageFile) ||
                      (Date.now() - lastTransactionTime < 5000) ||
                      (encryptionLevel > 0 && (!blogKeyHistory.current || isEncrypting || !encryptedData))}
                    className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(() => {
                      if (loading) {
                        return encryptionLevel > 0 ? 'Creating Encrypted Inscription...' : 'Creating Inscription...';
                      }
                      if (isEncrypting) {
                        return 'Encrypting...';
                      }
                      if (Date.now() - lastTransactionTime < 5000) {
                        return `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...`;
                      }
                      if (encryptionLevel > 0) {
                        return `Create Encrypted ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`;
                      }
                      return `Create ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`;
                    })()}
                  </button>
                </>
              )}
            </div>

            {/* Right Side - Encrypted Data Display */}
            <div className="space-y-4">
              {inscriptionType === 'largeProfile' || inscriptionType === 'largeProfile2' ? (
                <>
                  <h3 className="text-lg font-medium text-white">
                    {inscriptionType === 'largeProfile2' ? 'BCAT Manager Info' : 'BCAT Protocol Info'}
                  </h3>
                  <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-400 mb-2">
                      {inscriptionType === 'largeProfile2' ? 'BCAT Manager Features' : 'How BCAT Works'}
                    </h4>
                    <p className="text-xs text-gray-300 mb-3">
                      {inscriptionType === 'largeProfile2' 
                        ? 'Advanced BCAT management with enhanced features for large file handling.'
                        : 'BCAT (Bitcoin Concatenation) protocol allows storing large files on-chain by splitting them into multiple transactions.'}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-purple-400">1.</span>
                        <p className="text-xs text-gray-300">File is split into 9MB chunks</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-400">2.</span>
                        <p className="text-xs text-gray-300">Each chunk stored in separate TX</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-400">3.</span>
                        <p className="text-xs text-gray-300">Main TX contains thumbnail + references</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-400">4.</span>
                        <p className="text-xs text-gray-300">Files reassembled using TX IDs</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-purple-900 bg-opacity-30 rounded">
                      <p className="text-xs text-purple-300">
                        {inscriptionType === 'largeProfile2'
                          ? '🚀 Enhanced BCAT management with advanced features'
                          : '💡 Perfect for videos, large images, archives, and any file over 10MB'}
                      </p>
                    </div>
                  </div>
                  <WalletInfo 
                    keyData={keyData}
                    balance={balance}
                    blogKeyHistory={blogKeyHistory}
                  />
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-white">
                    {encryptionLevel > 0 ? 'Encrypted Data' : 'Preview'}
                  </h3>
                  
                  {/* Encrypted Data Display */}
                  {encryptionLevel > 0 ? (
                    <div className="h-full">
                      {isEncrypting ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                          <span className="ml-2 text-gray-300">Encrypting...</span>
                        </div>
                      ) : encryptedData ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-400">Encrypted Data</span>
                              <span className={`text-xs px-2 py-1 rounded bg-${getEncryptionLevelColor(encryptionLevel)}-600 text-white`}
                                style={{
                                  backgroundColor: {
                                    0: '#6B7280',
                                    1: '#F59E0B',
                                    2: '#EAB308',
                                    3: '#6366F1',
                                    4: '#A855F7',
                                    5: '#EF4444'
                                  }[encryptionLevel]
                                }}
                              >
                                Level {encryptionLevel}
                              </span>
                            </div>
                            <pre className="text-xs font-mono text-green-400 break-all max-h-64 overflow-y-auto">
                              {encryptedData.substring(0, 500)}
                              {encryptedData.length > 500 && '...'}
                            </pre>
                          </div>
                          
                          <div className="p-3 bg-gray-800 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Encrypted Size:</span>
                              <span className="text-gray-300">
                                {(encryptedSize / 1024).toFixed(2)} KB
                                {encryptedSize > 1024 * 1024 && ` (${(encryptedSize / 1024 / 1024).toFixed(2)} MB)`}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Est. Transaction Size:</span>
                              <span className="text-gray-300">
                                {(() => {
                                  const { calculateTransactionFee } = require('../utils/feeCalculator');
                                  const { estimatedSize } = calculateTransactionFee(1, 2, encryptedSize, currentFeeRate);
                                  return `${(estimatedSize / 1024 / 1024).toFixed(2)} MB / 5.0 MB`;
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Estimated Fee:</span>
                              <span className="text-gray-300">
                                {(() => {
                                  const { calculateTransactionFee } = require('../utils/feeCalculator');
                                  const { fee } = calculateTransactionFee(1, 2, encryptedSize, currentFeeRate);
                                  return `${fee.toLocaleString()} sats`;
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Access Level:</span>
                              <span className="text-gray-300">{getEncryptionLevelLabel(encryptionLevel)}</span>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-indigo-900 bg-opacity-30 rounded-lg border border-indigo-700">
                            <p className="text-xs text-indigo-300">
                              🔒 This data will be encrypted on-chain. Only holders of your blog key with level {encryptionLevel} access or higher can decrypt it.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 text-gray-500">
                          <p className="text-sm">Enter data to see encrypted preview</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Non-encrypted preview
                    <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Data Preview (Unencrypted)</p>
                      {inscriptionType === 'text' && textData && (
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">{textData}</pre>
                      )}
                      {inscriptionType === 'image' && imagePreview && (
                        <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                      )}
                      {(inscriptionType === 'profile' || inscriptionType === 'profile2' || inscriptionType === 'profile4') && (
                        <div className="text-sm text-gray-300 space-y-1">
                          <p><span className="text-gray-400">Username:</span> {profileData.username || 'Not set'}</p>
                          <p><span className="text-gray-400">Title:</span> {profileData.title || 'Not set'}</p>
                          <p><span className="text-gray-400">Bio:</span> {profileData.bio || 'Not set'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



// import React, { useState, useEffect } from 'react';
// import { useWalletStore } from '../../store/WalletStore';
// import { CreateTextInscription } from './CreateTextInscription';
// import { CreateImageInscription } from './CreateImageInscription';
// import { CreateProfileInscription } from './CreateProfileInscription';
// import { CreateProfile2Inscription } from './CreateProfile2Inscription';
// import { CreateLargeProfileInscription } from './CreateLargeProfileInscription';
// import { InscriptionTypeSelector } from './InscriptionTypeSelector';
// import { EncryptionOptions } from './EncryptionOptions';
// import { TransactionStatus } from './TransactionStatus';
// import { WalletInfo } from './WalletInfo';
// import { BlogEncryption, EncryptionLevel, getEncryptionLevelColor, getEncryptionLevelLabel } from  '../utils/BlogEncryption';
// import { createInscription } from '../utils/inscriptionCreator';
// // getEncryptionLevelColor getEncryptionLevelLabel  CreateLargeProfileInscription   import { InscriptionLargeProfileView } from './InscriptionLargeProfileView';



// interface CreateInscriptionProps {
//   network: 'mainnet' | 'testnet';
// }

// export const CreateInscription: React.FC<CreateInscriptionProps> = ({ network }) => {
//   const [inscriptionType, setInscriptionType] = useState<'text' | 'image' | 'profile' | 'profile2' | 'largeProfile'>('text');
//   const [textData, setTextData] = useState('');
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [imagePreview, setImagePreview] = useState<string>('');
//   const [profileData, setProfileData] = useState({
//     username: '',
//     title: '',
//     bio: '',
//     avatar: ''
//   });
//   const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
//   const [profileImagePreview, setProfileImagePreview] = useState<string>('');
//   const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
//   const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
//   const [loading, setLoading] = useState(false);
//   const [lastTransactionTime, setLastTransactionTime] = useState(0);
//   const [currentFeeRate, setCurrentFeeRate] = useState<number>(1);
//   const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ 
//     type: null, 
//     message: '' 
//   });
//   const [lastTxid, setLastTxid] = useState('');
//   const [encryptionLevel, setEncryptionLevel] = useState<EncryptionLevel>(0);
//   const [showEncryptionOptions, setShowEncryptionOptions] = useState(false);
//   const [encryptedData, setEncryptedData] = useState<string>('');
//   const [encryptedSize, setEncryptedSize] = useState<number>(0);
//   const [isEncrypting, setIsEncrypting] = useState(false);

//   const { keyData, balance, whatsOnChainApiKey, blogKeyHistory, getKeySegmentForLevel } = useWalletStore();

//   // Fetch current fee rate from the network
//   const fetchCurrentFeeRate = async () => {
//     try {
//       const defaultRateSatPerKB = 1;
      
//       const response = await fetch(
//         `https://api.whatsonchain.com/v1/bsv/${network === 'testnet' ? 'test' : 'main'}/fee/estimates`
//       ).catch(() => null);

//       if (response && response.ok) {
//         const feeData = await response.json();
//         const feeRatePerByte = feeData.standard || feeData.halfHour || 0.001;
//         const feeRatePerKB = feeRatePerByte * 1000;
        
//         const actualRate = Math.max(defaultRateSatPerKB, Math.round(feeRatePerKB));
//         setCurrentFeeRate(actualRate);
//         console.log(`Current network fee rate: ${actualRate} sat/KB`);
//         return actualRate;
//       }
//     } catch (error) {
//       console.log('Could not fetch fee rate, using default BSV rate');
//     }
    
//     const defaultRate = 1;
//     setCurrentFeeRate(defaultRate);
//     console.log(`Using default BSV fee rate: ${defaultRate} sat/KB`);
//     return defaultRate;
//   };

//   // Fetch fee rate on component mount and network change
//   useEffect(() => {
//     fetchCurrentFeeRate();
//   }, [network]);

//   // Auto-encrypt data when inputs or encryption level change
//   useEffect(() => {
//     if (encryptionLevel > 0 && blogKeyHistory.current && inscriptionType !== 'largeProfile') {
//       encryptCurrentData();
//     } else {
//       setEncryptedData('');
//       setEncryptedSize(0);
//     }
//   }, [textData, imageFile, profileData, profileImageFile, backgroundImageFile, encryptionLevel, inscriptionType]);

//   // Encrypt current data based on inscription type
//   const encryptCurrentData = async () => {
//     if (!blogKeyHistory.current || encryptionLevel === 0) {
//       setEncryptedData('');
//       setEncryptedSize(0);
//       return;
//     }

//     setIsEncrypting(true);
    
//     try {
//       const keySegment = getKeySegmentForLevel(encryptionLevel);
//       if (!keySegment) {
//         throw new Error('No key segment available for encryption level');
//       }

//       let dataToEncrypt: any;
//       let contentType = '';

//       // Prepare data based on inscription type
//       if (inscriptionType === 'text') {
//         if (!textData) {
//           setEncryptedData('');
//           setEncryptedSize(0);
//           setIsEncrypting(false);
//           return;
//         }
//         dataToEncrypt = textData;
//         contentType = 'text';
//       } else if (inscriptionType === 'image' && imageFile) {
//         // Handle image encryption
//         const { imageToBase64 } = await import('../utils/imageUtils');
//         const base64Data = await imageToBase64(imageFile, undefined, true, undefined, 'image');
//         dataToEncrypt = {
//           name: imageFile.name,
//           type: imageFile.type,
//           size: imageFile.size,
//           data: base64Data
//         };
//         contentType = 'image';
//       } else if (inscriptionType === 'profile' || inscriptionType === 'profile2') {
//         // Handle profile encryption
//         const { imageToBase64 } = await import('../utils/imageUtils');
//         const profileDataToSave: any = {
//           p: inscriptionType,
//           username: profileData.username || 'Anonymous',
//           title: profileData.title || 'BSV User',
//           bio: profileData.bio || 'On-chain profile',
//           timestamp: Date.now()
//         };
        
//         if (profileImageFile) {
//           const targetSize = inscriptionType === 'profile' ? undefined : undefined; // Let imageToBase64 handle limits
//           const base64Data = await imageToBase64(profileImageFile, undefined, true, targetSize, inscriptionType);
//           profileDataToSave.avatar = `data:${profileImageFile.type};base64,${base64Data}`;
//         }
        
//         if (inscriptionType === 'profile2' && backgroundImageFile) {
//           const base64Data = await imageToBase64(backgroundImageFile, undefined, true, undefined, 'profile2');
//           profileDataToSave.background = `data:${backgroundImageFile.type};base64,${base64Data}`;
//         }
        
//         dataToEncrypt = profileDataToSave;
//         contentType = inscriptionType;
//       } else {
//         setEncryptedData('');
//         setEncryptedSize(0);
//         setIsEncrypting(false);
//         return;
//       }

//       // Encrypt the data
//       const { encryptedData, metadata } = await BlogEncryption.prepareEncryptedInscription(
//         dataToEncrypt,
//         encryptionLevel,
//         keySegment
//       );
      
//       // Create the wrapper
//       const wrapper = {
//         encrypted: true,
//         originalType: contentType,
//         data: encryptedData,
//         metadata
//       };
      
//       const encryptedJson = JSON.stringify(wrapper);
//       const encryptedSizeBytes = new TextEncoder().encode(encryptedJson).length;
      
//       setEncryptedData(encryptedJson);
//       setEncryptedSize(encryptedSizeBytes);
      
//     } catch (error) {
//       console.error('Encryption error:', error);
//       setStatus({ 
//         type: 'error', 
//         message: 'Failed to encrypt data: ' + (error instanceof Error ? error.message : 'Unknown error')
//       });
//       setEncryptedData('');
//       setEncryptedSize(0);
//     } finally {
//       setIsEncrypting(false);
//     }
//   };

//   // Handle creating inscription
//   const handleCreateInscription = async () => {
//     try {
//       setLoading(true);
//       setStatus({ type: 'info', message: 'Preparing inscription...' });
      
//       const result = await createInscription({
//         inscriptionType,
//         textData,
//         imageFile,
//         profileData,
//         profileImageFile,
//         backgroundImageFile,
//         encryptionLevel,
//         encryptedData,
//         keyData,
//         network,
//         whatsOnChainApiKey,
//         blogKeyHistory,
//         currentFeeRate,
//         lastTransactionTime
//       });

//       if (result.success) {
//         setLastTxid(result.txid!);
//         setLastTransactionTime(Date.now());
//         setStatus({ 
//           type: 'success', 
//           message: result.message 
//         });
        
//         // Reset form
//         setTextData('');
//         setImageFile(null);
//         setImagePreview('');
//         setProfileData({ username: '', title: '', bio: '', avatar: '' });
//         setProfileImageFile(null);
//         setProfileImagePreview('');
//         setBackgroundImageFile(null);
//         setBackgroundImagePreview('');
//         setEncryptedData('');
//         setEncryptedSize(0);
//       } else {
//         setStatus({ 
//           type: 'error', 
//           message: result.error || 'Failed to create inscription' 
//         });
//       }
//     } catch (error) {
//       setStatus({ 
//         type: 'error', 
//         message: error instanceof Error ? error.message : 'Failed to create inscription' 
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div>
//       <div className="mb-4 p-4 bg-gradient-to-r from-purple-900 to-pink-900 bg-opacity-20 rounded-lg border border-purple-700">
//         <h2 className="text-xl font-semibold text-white">Create Inscription</h2>
//         <p className="text-sm text-gray-300 mt-1">Create text, image, or profile inscriptions on BSV</p>
//       </div>

//       <TransactionStatus 
//         status={status} 
//         lastTxid={lastTxid} 
//         network={network}
//         lastTransactionTime={lastTransactionTime}
//       />

//       <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
//         <div className="space-y-4">
//           <InscriptionTypeSelector 
//             inscriptionType={inscriptionType}
//             setInscriptionType={setInscriptionType}
//           />

//           {/* Show encryption options for all types except largeProfile */}
//           {inscriptionType !== 'largeProfile' && (
//             <EncryptionOptions
//               encryptionLevel={encryptionLevel}
//               setEncryptionLevel={setEncryptionLevel}
//               showEncryptionOptions={showEncryptionOptions}
//               setShowEncryptionOptions={setShowEncryptionOptions}
//               blogKeyHistory={blogKeyHistory}
//             />
//           )}

//           <div className="grid grid-cols-2 gap-4">
//             {/* Left Side - Original Data Input */}
//             <div className="space-y-4">
//               <h3 className="text-lg font-medium text-white">Original Data</h3>
              
//               {inscriptionType === 'text' && (
//                 <CreateTextInscription
//                   textData={textData}
//                   setTextData={setTextData}
//                 />
//               )}

//               {inscriptionType === 'image' && (
//                 <CreateImageInscription
//                   imageFile={imageFile}
//                   setImageFile={setImageFile}
//                   imagePreview={imagePreview}
//                   setImagePreview={setImagePreview}
//                   setStatus={setStatus}
//                   currentFeeRate={currentFeeRate}
//                   encryptionLevel={encryptionLevel}
//                 />
//               )}

//               {inscriptionType === 'profile' && (
//                 <CreateProfileInscription
//                   profileData={profileData}
//                   setProfileData={setProfileData}
//                   profileImageFile={profileImageFile}
//                   setProfileImageFile={setProfileImageFile}
//                   profileImagePreview={profileImagePreview}
//                   setProfileImagePreview={setProfileImagePreview}
//                   setStatus={setStatus}
//                 />
//               )}

//               {inscriptionType === 'profile2' && (
//                 <CreateProfile2Inscription
//                   profileData={profileData}
//                   setProfileData={setProfileData}
//                   profileImageFile={profileImageFile}
//                   setProfileImageFile={setProfileImageFile}
//                   profileImagePreview={profileImagePreview}
//                   setProfileImagePreview={setProfileImagePreview}
//                   backgroundImageFile={backgroundImageFile}
//                   setBackgroundImageFile={setBackgroundImageFile}
//                   backgroundImagePreview={backgroundImagePreview}
//                   setBackgroundImagePreview={setBackgroundImagePreview}
//                   setStatus={setStatus}
//                 />
//               )}

//               {inscriptionType === 'largeProfile' && (
//                 <CreateLargeProfileInscription
//                   keyData={keyData}
//                   network={network}
//                   whatsOnChainApiKey={whatsOnChainApiKey}
//                   currentFeeRate={currentFeeRate}
//                   balance={balance}
//                   lastTransactionTime={lastTransactionTime}
//                   setStatus={setStatus}
//                   setLastTxid={setLastTxid}
//                   setLastTransactionTime={setLastTransactionTime}
//                 />
//               )}

//               {inscriptionType !== 'largeProfile' && (
//                 <>
//                   <WalletInfo 
//                     keyData={keyData}
//                     balance={balance}
//                     blogKeyHistory={blogKeyHistory}
//                   />

//                   {/* Create Button (shows for both encrypted and non-encrypted) */}
//                   <button
//                     onClick={handleCreateInscription}
//                     disabled={loading || !keyData.privateKey || balance.confirmed < 500 || 
//                       (inscriptionType === 'image' && !imageFile) ||
//                       (inscriptionType === 'profile2' && !profileImageFile && !backgroundImageFile) ||
//                       (Date.now() - lastTransactionTime < 5000) ||
//                       (encryptionLevel > 0 && (!blogKeyHistory.current || isEncrypting || !encryptedData))}
//                     className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {(() => {
//                       if (loading) {
//                         return encryptionLevel > 0 ? 'Creating Encrypted Inscription...' : 'Creating Inscription...';
//                       }
//                       if (isEncrypting) {
//                         return 'Encrypting...';
//                       }
//                       if (Date.now() - lastTransactionTime < 5000) {
//                         return `Wait ${Math.ceil((5000 - (Date.now() - lastTransactionTime)) / 1000)}s...`;
//                       }
//                       if (encryptionLevel > 0) {
//                         return `Create Encrypted ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`;
//                       }
//                       return `Create ${inscriptionType.charAt(0).toUpperCase() + inscriptionType.slice(1)} Ordinal`;
//                     })()}
//                   </button>
//                 </>
//               )}
//             </div>

//             {/* Right Side - Encrypted Data Display */}
//             <div className="space-y-4">
//               {inscriptionType === 'largeProfile' ? (
//                 <>
//                   <h3 className="text-lg font-medium text-white">BCAT Protocol Info</h3>
//                   <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
//                     <h4 className="text-sm font-medium text-purple-400 mb-2">How BCAT Works</h4>
//                     <p className="text-xs text-gray-300 mb-3">
//                       BCAT (Bitcoin Concatenation) protocol allows storing large files on-chain by splitting them into multiple transactions.
//                     </p>
//                     <div className="space-y-2">
//                       <div className="flex items-start gap-2">
//                         <span className="text-purple-400">1.</span>
//                         <p className="text-xs text-gray-300">File is split into 9MB chunks</p>
//                       </div>
//                       <div className="flex items-start gap-2">
//                         <span className="text-purple-400">2.</span>
//                         <p className="text-xs text-gray-300">Each chunk stored in separate TX</p>
//                       </div>
//                       <div className="flex items-start gap-2">
//                         <span className="text-purple-400">3.</span>
//                         <p className="text-xs text-gray-300">Main TX contains thumbnail + references</p>
//                       </div>
//                       <div className="flex items-start gap-2">
//                         <span className="text-purple-400">4.</span>
//                         <p className="text-xs text-gray-300">Files reassembled using TX IDs</p>
//                       </div>
//                     </div>
//                     <div className="mt-3 p-2 bg-purple-900 bg-opacity-30 rounded">
//                       <p className="text-xs text-purple-300">
//                         💡 Perfect for videos, large images, archives, and any file over 10MB
//                       </p>
//                     </div>
//                   </div>
//                   <WalletInfo 
//                     keyData={keyData}
//                     balance={balance}
//                     blogKeyHistory={blogKeyHistory}
//                   />
//                 </>
//               ) : (
//                 <>
//                   <h3 className="text-lg font-medium text-white">
//                     {encryptionLevel > 0 ? 'Encrypted Data' : 'Preview'}
//                   </h3>
                  
//                   {/* Encrypted Data Display */}
//                   {encryptionLevel > 0 ? (
//                     <div className="h-full">
//                       {isEncrypting ? (
//                         <div className="flex items-center justify-center h-32">
//                           <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
//                           <span className="ml-2 text-gray-300">Encrypting...</span>
//                         </div>
//                       ) : encryptedData ? (
//                         <div className="space-y-4">
//                           <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
//                             <div className="flex items-center justify-between mb-2">
//                               <span className="text-sm font-medium text-green-400">Encrypted Data</span>
//                               <span className={`text-xs px-2 py-1 rounded bg-${getEncryptionLevelColor(encryptionLevel)}-600 text-white`}
//                                 style={{
//                                   backgroundColor: {
//                                     0: '#6B7280',
//                                     1: '#F59E0B',
//                                     2: '#EAB308',
//                                     3: '#6366F1',
//                                     4: '#A855F7',
//                                     5: '#EF4444'
//                                   }[encryptionLevel]
//                                 }}
//                               >
//                                 Level {encryptionLevel}
//                               </span>
//                             </div>
//                             <pre className="text-xs font-mono text-green-400 break-all max-h-64 overflow-y-auto">
//                               {encryptedData.substring(0, 500)}
//                               {encryptedData.length > 500 && '...'}
//                             </pre>
//                           </div>
                          
//                           <div className="p-3 bg-gray-800 rounded-lg space-y-2">
//                             <div className="flex justify-between text-sm">
//                               <span className="text-gray-400">Encrypted Size:</span>
//                               <span className="text-gray-300">
//                                 {(encryptedSize / 1024).toFixed(2)} KB
//                                 {encryptedSize > 1024 * 1024 && ` (${(encryptedSize / 1024 / 1024).toFixed(2)} MB)`}
//                               </span>
//                             </div>
//                             <div className="flex justify-between text-sm">
//                               <span className="text-gray-400">Est. Transaction Size:</span>
//                               <span className="text-gray-300">
//                                 {(() => {
//                                   const { calculateTransactionFee } = require('../utils/feeCalculator');
//                                   const { estimatedSize } = calculateTransactionFee(1, 2, encryptedSize, currentFeeRate);
//                                   return `${(estimatedSize / 1024 / 1024).toFixed(2)} MB / 5.0 MB`;
//                                 })()}
//                               </span>
//                             </div>
//                             <div className="flex justify-between text-sm">
//                               <span className="text-gray-400">Estimated Fee:</span>
//                               <span className="text-gray-300">
//                                 {(() => {
//                                   const { calculateTransactionFee } = require('../utils/feeCalculator');
//                                   const { fee } = calculateTransactionFee(1, 2, encryptedSize, currentFeeRate);
//                                   return `${fee.toLocaleString()} sats`;
//                                 })()}
//                               </span>
//                             </div>
//                             <div className="flex justify-between text-sm">
//                               <span className="text-gray-400">Access Level:</span>
//                               <span className="text-gray-300">{getEncryptionLevelLabel(encryptionLevel)}</span>
//                             </div>
//                           </div>
                          
//                           <div className="p-3 bg-indigo-900 bg-opacity-30 rounded-lg border border-indigo-700">
//                             <p className="text-xs text-indigo-300">
//                               🔒 This data will be encrypted on-chain. Only holders of your blog key with level {encryptionLevel} access or higher can decrypt it.
//                             </p>
//                           </div>
//                         </div>
//                       ) : (
//                         <div className="flex items-center justify-center h-32 text-gray-500">
//                           <p className="text-sm">Enter data to see encrypted preview</p>
//                         </div>
//                       )}
//                     </div>
//                   ) : (
//                     // Non-encrypted preview
//                     <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
//                       <p className="text-sm text-gray-400 mb-2">Data Preview (Unencrypted)</p>
//                       {inscriptionType === 'text' && textData && (
//                         <pre className="text-xs text-gray-300 whitespace-pre-wrap">{textData}</pre>
//                       )}
//                       {inscriptionType === 'image' && imagePreview && (
//                         <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded" />
//                       )}
//                       {(inscriptionType === 'profile' || inscriptionType === 'profile2') && (
//                         <div className="text-sm text-gray-300 space-y-1">
//                           <p><span className="text-gray-400">Username:</span> {profileData.username || 'Not set'}</p>
//                           <p><span className="text-gray-400">Title:</span> {profileData.title || 'Not set'}</p>
//                           <p><span className="text-gray-400">Bio:</span> {profileData.bio || 'Not set'}</p>
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };