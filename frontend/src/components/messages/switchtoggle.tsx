import React from 'react';
import './SwitchToggle.css';

interface SwitchToggleProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SwitchToggle: React.FC<SwitchToggleProps> = ({ id, checked, onCheckedChange, disabled = false }) => {
  const handleToggle = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <label className={`switch ${disabled ? 'disabled' : ''}`}>
      <input 
        id={id}
        type="checkbox" 
        checked={checked} 
        onChange={handleToggle}
        disabled={disabled}
      />
      <span className="slider round"></span>
    </label>
  );
};

export default SwitchToggle;

// BEFORE ENCRYPTION 

// import React from 'react';
// import './SwitchToggle.css';

// interface SwitchToggleProps {
//   id?: string;
//   checked: boolean;
//   onCheckedChange: (checked: boolean) => void;
// }

// const SwitchToggle: React.FC<SwitchToggleProps> = ({ id, checked, onCheckedChange }) => {
//   const handleToggle = () => {
//     onCheckedChange(!checked);
//   };

//   return (
//     <label className="switch">
//       <input 
//         id={id}
//         type="checkbox" 
//         checked={checked} 
//         onChange={handleToggle} 
//       />
//       <span className="slider round"></span>
//     </label>
//   );
// };

// export default SwitchToggle;

        //   <Label htmlFor="master-decrypt" className="text-sm font-medium">
        //     {masterDecrypt ? "Decrypted" : "Encrypted"}
        //   </Label>
