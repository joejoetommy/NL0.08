// Add this import at the top of CreateInscription.tsx with the other imports:
import { CreateEncryptedPropertyInscription } from './CreateEncryptedPropertyInscription';

// Update the InscriptionTypeSelector component to include the new tab:
// In the InscriptionTypeSelectorProps interface, update the type:
export type InscriptionType = 'text' | 'image' | 'profile' | 'profile2' | 'largeProfile' | 'largeProfile2' | 'encryptedProperty';

// In the CreateInscription component, update the initial state:
const [inscriptionType, setInscriptionType] = useState<InscriptionType>('text');

// In the InscriptionTypeSelector component JSX, add the new button:
<div className="grid grid-cols-3 gap-2">
  {/* ... existing buttons ... */}
  
  {/* Add this new button */}
  <button
    onClick={() => setInscriptionType('encryptedProperty')}
    className={`p-3 rounded-lg text-center transition-all ${
      inscriptionType === 'encryptedProperty'
        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
    }`}
  >
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl">🏠🔒</span>
      <span className="text-xs font-medium">Encrypted Property</span>
      <span className="text-[10px] opacity-75">BCAT + Encryption</span>
    </div>
  </button>
</div>

// In the main render section where inscription types are rendered, add:
{inscriptionType === 'encryptedProperty' && (
  <CreateEncryptedPropertyInscription
    keyData={keyData}
    network={network}
    whatsOnChainApiKey={whatsOnChainApiKey}
    currentFeeRate={currentFeeRate}
    balance={balance}
    lastTransactionTime={lastTransactionTime}
    setStatus={setStatus}
    setLastTxid={setLastTxid}
    setLastTransactionTime={setLastTransactionTime}
    blogKeyHistory={blogKeyHistory}
    getKeySegmentForLevel={getKeySegmentForLevel}
  />
)}

// Also update the condition that hides encryption options for large profiles:
{inscriptionType !== 'largeProfile' && inscriptionType !== 'largeProfile2' && inscriptionType !== 'encryptedProperty' && (
  <EncryptionOptions
    encryptionLevel={encryptionLevel}
    setEncryptionLevel={setEncryptionLevel}
    showEncryptionOptions={showEncryptionOptions}
    setShowEncryptionOptions={setShowEncryptionOptions}
    blogKeyHistory={blogKeyHistory}
  />
)}

// Update the condition for showing wallet info and create button:
{inscriptionType !== 'largeProfile' && inscriptionType !== 'largeProfile2' && inscriptionType !== 'encryptedProperty' && (
  <>
    <WalletInfo 
      keyData={keyData}
      balance={balance}
      blogKeyHistory={blogKeyHistory}
    />
    
    {/* Create Button */}
    <button
      onClick={handleCreateInscription}
      disabled={/* ... existing conditions ... */}
      className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* ... existing button text logic ... */}
    </button>
  </>
)}