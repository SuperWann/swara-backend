const axios = require("axios");

class ChatGPTService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = "https://api.openai.com/v1/chat/completions";
    this.model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
    this.timeout = 30000;
  }

  /**
   * Generate keywords from custom topic using ChatGPT
   * @param {string} customTopic - User's custom topic
   * @returns {Promise<string>} - Generated keywords for evaluation
   */
  async generateKeywords(customTopic) {
    try {
      if (!this.apiKey) {
        throw new Error("OpenAI API key is not configured");
      }

      const prompt = `Kamu adalah asisten yang membantu membuat kriteria penilaian untuk latihan public speaking dalam bahasa Indonesia.

Topic yang dipilih user: "${customTopic}"

Buatlah 5-10 kata kunci atau frasa penting yang harus ada dalam presentasi tentang topic ini. Kata kunci ini akan digunakan untuk menilai apakah pembicara memahami dan menyampaikan poin-poin penting dari topic tersebut.

Format jawaban: Berikan daftar kata kunci yang dipisahkan dengan koma, tanpa numbering atau bullet points.

Contoh jawaban: "perubahan iklim, pemanasan global, emisi karbon, energi terbarukan, dampak lingkungan, solusi berkelanjutan"`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that generates evaluation keywords for public speaking practice in Indonesian language.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: this.timeout,
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response from ChatGPT");
      }

      const keywords = response.data.choices[0].message.content.trim();

      return keywords;
    } catch (error) {
      console.error("ChatGPT Service Error:", error.message);

      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.error?.message || error.response.statusText;

        if (status === 401) {
          throw new Error("OpenAI API key tidak valid");
        } else if (status === 429) {
          throw new Error(
            "OpenAI API rate limit exceeded. Silakan coba beberapa saat lagi."
          );
        } else if (status === 500) {
          throw new Error(
            "OpenAI service sedang bermasalah. Silakan coba lagi nanti."
          );
        } else {
          throw new Error(`ChatGPT Error: ${message}`);
        }
      } else if (error.request) {
        throw new Error(
          "ChatGPT service tidak merespons. Silakan coba lagi nanti."
        );
      } else {
        throw new Error(`Error generating keywords: ${error.message}`);
      }
    }
  }

  /**
   * Validate if generated keywords are appropriate
   * @param {string} keywords - Generated keywords string
   * @returns {boolean}
   */
  validateKeywords(keywords) {
    if (!keywords || typeof keywords !== "string") {
      return false;
    }

    const trimmed = keywords.trim();

    return trimmed.length >= 10 && trimmed.includes(",");
  }
}

module.exports = new ChatGPTService();
