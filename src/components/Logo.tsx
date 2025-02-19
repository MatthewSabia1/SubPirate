import React from 'react';
import { Skull } from 'lucide-react';

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Skull className="text-[#C69B7B]" size={24} />
      <span className="text-xl font-semibold">SubPirate</span>
    </div>
  );
}

export default Logo;