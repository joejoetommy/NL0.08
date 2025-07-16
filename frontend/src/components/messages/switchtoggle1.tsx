import React from 'react';
import './SwitchToggle1.css';

interface SwitchToggleProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const SwitchToggle: React.FC<SwitchToggleProps> = ({ id, checked, onCheckedChange }) => {
  const handleToggle = () => {
    onCheckedChange(!checked);
  };

  return (
    <label className="switch">
      <input 
        id={id}
        type="checkbox" 
        checked={checked} 
        onChange={handleToggle} 
      />
      <span className="slider round"></span>
    </label>
  );
};

export default SwitchToggle;

        //   <Label htmlFor="master-decrypt" className="text-sm font-medium">
        //     {masterDecrypt ? "Decrypted" : "Encrypted"}
        //   </Label>
