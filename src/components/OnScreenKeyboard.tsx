// ============================================
// OnScreenKeyboard.tsx - Alphanumeric On-Screen Keyboard
// For kiosk employee ID input
// ============================================

import React, { useState } from 'react';
import { Box, Button, Paper, Typography, IconButton } from '@mui/material';
import { Backspace as BackspaceIcon, Close as CloseIcon, KeyboardCapslock as CapsIcon } from '@mui/icons-material';

interface OnScreenKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  onClose: () => void;
  maxLength?: number;
  title?: string;
}

const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({
  value,
  onChange,
  onEnter,
  onClose,
  maxLength = 20,
  title = 'Enter Employee ID',
}) => {
  const [capsLock, setCapsLock] = useState(false);

  const handleKeyPress = (key: string) => {
    if (value.length < maxLength) {
      const char = capsLock ? key.toUpperCase() : key.toLowerCase();
      onChange(value + char);
    }
  };

  const handleNumberPress = (key: string) => {
    if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const toggleCapsLock = () => {
    setCapsLock(!capsLock);
  };

  // Keyboard layout
  const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  const keyButtonStyle = {
    minWidth: 50,
    minHeight: 55,
    fontSize: '1.2rem',
    fontWeight: 'bold',
    m: 0.3,
    borderRadius: 1.5,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.2)',
    '&:hover': {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
      border: '1px solid rgba(255,255,255,0.4)',
    },
    '&:active': {
      transform: 'scale(0.95)',
    },
  };

  const actionButtonStyle = {
    ...keyButtonStyle,
    minWidth: 80,
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    '&:hover': {
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    },
  };

  const enterButtonStyle = {
    ...keyButtonStyle,
    minWidth: 120,
    fontSize: '1.1rem',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    '&:hover': {
      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    },
  };

  const clearButtonStyle = {
    ...keyButtonStyle,
    minWidth: 80,
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    '&:hover': {
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    },
  };

  const capsButtonStyle = {
    ...keyButtonStyle,
    minWidth: 70,
    background: capsLock 
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    '&:hover': {
      background: capsLock 
        ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
        : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
    },
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'rgba(26, 26, 46, 0.98)',
        borderTop: '2px solid rgba(255,255,255,0.1)',
        p: 2,
        zIndex: 1300,
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ color: 'white' }}>
          {title}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Display */}
      <Box
        sx={{
          bgcolor: 'rgba(0,0,0,0.3)',
          borderRadius: 2,
          p: 1.5,
          mb: 2,
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: '#4ade80',
            fontFamily: 'monospace',
            letterSpacing: 4,
            minHeight: 45,
          }}
        >
          {value || '—'}
        </Typography>
      </Box>

      {/* Keyboard */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Number Row */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {numberRow.map((key) => (
            <Button key={key} onClick={() => handleNumberPress(key)} sx={keyButtonStyle}>
              {key}
            </Button>
          ))}
          <Button onClick={handleBackspace} sx={actionButtonStyle}>
            <BackspaceIcon />
          </Button>
        </Box>

        {/* Row 1: Q-P */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {row1.map((key) => (
            <Button key={key} onClick={() => handleKeyPress(key)} sx={keyButtonStyle}>
              {capsLock ? key : key.toLowerCase()}
            </Button>
          ))}
        </Box>

        {/* Row 2: A-L */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button onClick={toggleCapsLock} sx={capsButtonStyle}>
            <CapsIcon sx={{ mr: 0.5 }} />
            {capsLock ? 'ON' : 'off'}
          </Button>
          {row2.map((key) => (
            <Button key={key} onClick={() => handleKeyPress(key)} sx={keyButtonStyle}>
              {capsLock ? key : key.toLowerCase()}
            </Button>
          ))}
        </Box>

        {/* Row 3: Z-M */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button onClick={handleClear} sx={clearButtonStyle}>
            Clear
          </Button>
          {row3.map((key) => (
            <Button key={key} onClick={() => handleKeyPress(key)} sx={keyButtonStyle}>
              {capsLock ? key : key.toLowerCase()}
            </Button>
          ))}
          <Button
            onClick={onEnter}
            disabled={!value}
            sx={{
              ...enterButtonStyle,
              '&:disabled': {
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            Enter / OK
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default OnScreenKeyboard;
