import React, { useState } from 'react';

// Since we're not using shadcn/ui, we'll create simple replacements
const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={className} {...props} />
);

const Switch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <label className="inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={onChange}
    />
    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-gray-600 peer-checked:bg-blue-500 relative transition duration-200">
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-full transition-transform duration-200" />
    </div>
  </label>
);

const EntryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Login');
  const [userData, setUserData] = useState({
    user: '',
    password: '',
    confirmPassword: '',
    words: Array(12).fill(''),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [XpubInput, setXpubInput] = useState('');

  const handleXpubSubmit = () => {
    alert(`Submitted: ${XpubInput}`);
    setXpubInput(''); // Optionally clear the input after submission
  };

  const [tabOneData, setTabOneData] = useState({
    username: '',
    password: '',
  });
  
  const [tabTwoData, setTabTwoData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  
  const [passwordValidationMessage, setPasswordValidationMessage] = useState('');
  const [passwordMatchMessage, setPasswordMatchMessage] = useState('');

  const handleTabTwoUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTabTwoData({ ...tabTwoData, username: e.target.value });
  };
  
  const handleTabTwoPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTabTwoData({ ...tabTwoData, password: e.target.value });
    validatePassword(e.target.value);
  };
  
  const handleTabTwoConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setTabTwoData({ ...tabTwoData, confirmPassword: newConfirmPassword });
    setPasswordMatchMessage(newConfirmPassword === tabTwoData.password ? '' : "Passwords don't match");
  };

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-z]/.test(password);
    const isValidLength = password.length >= 8;
  
    if (!isValidLength || !hasNumber || !hasLetter || !hasUpperCase) {
      setPasswordValidationMessage('Minimum 8 characters, with 1 letter, 1 number, 1 uppercase');
    } else {
      setPasswordValidationMessage('');
    }
  };

  const handleTabOneUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTabOneData({ ...tabOneData, username: e.target.value });
  };
  
  const handleTabOnePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTabOneData({ ...tabOneData, password: e.target.value });
    validatePassword(e.target.value);
  };

  const handleSignIn = () => {
    alert(`Signing in with user: ${tabOneData.username}@NL and password: ${tabOneData.password}`);
  };

  const handleSignUp = () => {
    alert(`Signing up with user: ${tabTwoData.username}@NL, password: ${tabTwoData.password}`);
  };

  const isPasswordValid = (password: string) =>
    password.length >= 8 && /\d/.test(password) && /[A-Za-z]/.test(password) && /\W/.test(password);

  const allFieldsFilled = tabTwoData.username && 
    validatePassword(tabTwoData.password) === undefined && 
    tabTwoData.password === tabTwoData.confirmPassword;

  const handleWordChange = (index: number, value: string) => {
    setUserData((prevData) => {
      const words = [...prevData.words];
      words[index] = value;
      return { ...prevData, words };
    });
  };

  const handleSubmitWords = () => {
    console.log('Submitting words:', userData.words);
  };
  
  const clearWords = () => {
    setUserData((prevData) => ({ ...prevData, words: Array(12).fill('') }));
  };

  const [useCustomDerivation, setUseCustomDerivation] = useState(false);
  const [derivationPath, setDerivationPath] = useState('');

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-gray-800 p-1 w-full max-w-sm rounded-lg">
        <div className="flex border-b border-gray-700 w-full bg-gray-800">
          {['Login', 'Sign-Up', 'Mnemonics', 'Xpub'].map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-2 text-center transition duration-300 ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="p-4">
          <div className="flex justify-center items-center w-[320px] h-[400px] bg-gray-800 p-4 rounded-lg shadow-lg">
            {activeTab === 'Login' && (
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-300">User</label>
                <div className="flex items-center bg-gray-900 rounded border border-gray-700">
                  <input
                    type="text"
                    className="flex-1 p-2 bg-transparent text-white"
                    value={tabOneData.username}
                    onChange={handleTabOneUsernameChange}
                  />
                  <span className="p-2 bg-gray-700 text-white">@NL</span>
                </div>
                <label className="block mb-2 text-sm font-bold text-gray-300">Password</label>
                <div className="flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full p-2 bg-gray-900 text-white rounded border border-gray-700"
                    value={tabOneData.password}
                    onChange={handleTabOnePasswordChange}
                  />
                  <button
                    className="ml-2 text-sm text-blue-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={handleSignIn}
                >
                  Sign-In
                </button>
              </div>
            )}

            {activeTab === 'Sign-Up' && (
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-300">User</label>
                <div className="flex items-center bg-gray-900 rounded border border-gray-700">
                  <input
                    type="text"
                    className="flex-1 p-2 bg-transparent text-white"
                    value={tabTwoData.username}
                    onChange={handleTabTwoUsernameChange}
                  />
                  <span className="p-2 bg-gray-700 text-white">@NL</span>
                </div>

                <label className="block mb-2 text-sm font-bold text-gray-300">Password</label>
                <div className="flex flex-col">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="p-2 bg-gray-900 text-white rounded border border-gray-700"
                    value={tabTwoData.password}
                    onChange={handleTabTwoPasswordChange}
                  />
                  <span className="text-xs text-red-500">{passwordValidationMessage}</span>
                  <button
                    className="self-end mt-2 text-sm text-blue-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <label className="block mb-2 text-sm font-bold text-gray-300">Repeat Password</label>
                <div className="flex flex-col">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="p-2 bg-gray-900 text-white rounded border border-gray-700"
                    value={tabTwoData.confirmPassword}
                    onChange={handleTabTwoConfirmPasswordChange}
                  />
                  <span className="text-xs text-red-500">{passwordMatchMessage}</span>
                </div>

                <button
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-blue-600"
                  disabled={!tabTwoData.username || passwordValidationMessage !== '' || tabTwoData.password !== tabTwoData.confirmPassword}
                  onClick={handleSignUp}
                >
                  Sign-Up
                </button>
              </div>
            )}

            {activeTab === 'Mnemonics' && (
              <div className="grid grid-cols-2 gap-4">
                {userData.words.map((word, index) => (
                  <div key={`word-${index}`} className="flex items-center">
                    <span className="text-sm font-bold text-gray-300 mr-2">{`${(index + 1).toString().padStart(2, '0')}:`}</span>
                    <input
                      type="text"
                      className="flex w-4/5 p-2 bg-gray-900 text-white rounded border border-gray-700"
                      value={word}
                      onChange={(e) => handleWordChange(index, e.target.value)}
                    />
                  </div>
                ))}
                <div className="flex gap-20 justify-between">
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    disabled={userData.words.some(word => word === '')}
                    onClick={handleSubmitWords}
                  >
                    Submit
                  </button>

                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={clearWords}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Xpub' && (
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-300">Xpub</label>
                <div className="flex items-center bg-gray-900 rounded border border-gray-700 w-full">
                  <Textarea
                    className="p-2 bg-gray-900 text-white rounded border border-gray-700 w-[314px] h-[200px]"
                    placeholder="Enter xpub here..."
                    value={XpubInput}
                    onChange={(e) => setXpubInput(e.target.value)}
                  />
                </div>

                {useCustomDerivation && (
                  <div className="mt-4">
                    <label className="block mb-2 text-sm font-bold text-gray-300">Derivation</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-gray-900 text-white rounded border border-gray-700"
                      placeholder="e.g. m/44'/236'/0'/0'"
                      value={derivationPath}
                      onChange={(e) => setDerivationPath(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-300 font-semibold">Use custom derivations</span>
                  <Switch
                    checked={useCustomDerivation}
                    onChange={() => setUseCustomDerivation(!useCustomDerivation)}
                  />
                </div>

                <button
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-blue-600"
                  onClick={() => {
                    const payload = {
                      xpub: XpubInput,
                      ...(useCustomDerivation && { derivation: derivationPath })
                    };
                    alert(`Submitted: ${JSON.stringify(payload, null, 2)}`);
                    setXpubInput('');
                    setDerivationPath('');
                    setUseCustomDerivation(false);
                  }}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryPage;