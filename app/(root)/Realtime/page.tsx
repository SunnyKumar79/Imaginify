"use client"
import React, { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateImage = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          prompt,
          n: 1,
          size: "512x512"
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`, // Correct usage of template literals
            'Content-Type': 'application/json'
          }
        }
      );
      const imageUrl = response.data.data[0].url;
      setImageUrl(imageUrl);
    } catch (error) {
      console.error('Error generating image:', error);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h1>Text-to-Image Generator</h1>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter a prompt"
        style={{ padding: '10px', width: '300px', marginBottom: '20px' }}
      />
      <button onClick={generateImage} style={{ padding: '10px', cursor: 'pointer' }}>
        Generate Image
      </button>
      {loading && <p>Generating...</p>}
      {imageUrl && (
        <div style={{ marginTop: '20px' }}>
          <img src={imageUrl} alt="Generated" style={{ width: '300px', height: '300px', objectFit: 'cover' }} />
        </div>
      )}
    </div>
  );
}
