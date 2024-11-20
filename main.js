import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';

// 🔥🔥 FILL THIS OUT FIRST! 🔥🔥
let API_KEY = 'AIzaSyANMyn6bXSycOyVWYSifBA0i453nLOybNM';

let form = document.querySelector('form');
let promptInput = document.querySelector('input[name="prompt"]');
let output = document.querySelector('.output');

// Array untuk menyimpan riwayat percakapan
let chatHistory = [];

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-pro",
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ],
});

const chat = model.startChat({
  history: [],
  generationConfig: {
    maxOutputTokens: 1500
  }
});

// Fungsi untuk mengirim pesan dengan logika percobaan ulang
async function sendMessageWithRetry(chatHistory, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await chat.sendMessageStream(chatHistory);
      return result; // Jika berhasil, kembalikan hasil
    } catch (error) {
      if (error.message.includes('503')) {
        console.warn(`Attempt ${i + 1} failed: ${error.message}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik sebelum mencoba lagi
      } else {
        throw error; // Jika bukan kesalahan 503, lempar ulang kesalahan
      }
    }
  }
  throw new Error('Max retries reached. Unable to send message.');
}

// Di dalam form.onsubmit:
form.onsubmit = async (ev) => {
  ev.preventDefault();
  output.textContent = 'Generating...';

  const prompt = promptInput.value;

  // Simpan pertanyaan ke dalam riwayat
  chatHistory.push(prompt);

  try {
    // Kirim riwayat percakapan ke model dengan retry logic
    const result = await sendMessageWithRetry(chatHistory);

    let buffer = [];
    let md = new MarkdownIt();
    
    // Pastikan ada respons dari stream
    for await (let response of result.stream) {
      if (response.text()) {
        buffer.push(response.text());
        // Hanya tampilkan respons terbaru
        output.innerHTML = md.render(buffer.join(''));
      } else {
        console.error('No text in response:', response);
      }
    }

    // Simpan jawaban ke dalam riwayat
    const answer = buffer.join('');
    chatHistory.push(answer); // Simpan jawaban ke dalam riwayat

  } catch (e) {
    console.error('Error during chat:', e);
    output.innerHTML += '<hr>' + e.message; // Tampilkan pesan error
  }
};

// You can delete this once you've filled out an API key
maybeShowApiKeyBanner(API_KEY);