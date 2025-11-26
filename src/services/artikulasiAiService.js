const { Client } = require("@gradio/client");
const fs = require("fs");
const path = require("path");

const { Blob } = globalThis.Blob ? globalThis : require("buffer");

class ArtikulasiAiService {
  constructor() {
    this.spaceUrl =
      process.env.ARTIKULASI_AI_URL ||
      "https://cyberlace-latihan-artikulasi.hf.space";
    this.apiName = "/score_audio_api";
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
      ".aac": "audio/aac",
      ".ogg": "audio/ogg",
      ".flac": "audio/flac",
    };
    return mimeTypes[ext] || "audio/mpeg";
  }

  /**
   * Analyze audio for articulation training using Gradio Client
   * @param {Buffer|string} audioFileOrPath - Audio file buffer or path to audio file
   * @param {string} targetText - Target text from material
   * @param {number} level - Training level (1-5)
   * @param {string} filename - Original filename
   * @returns {Promise<object>} - AI analysis result
   */
  async analyzeArticulation(
    audioFileOrPath,
    targetText,
    level,
    filename = "audio.mp3"
  ) {
    let tempFilePath = null;

    try {
      console.log(
        `Analyzing articulation: target="${targetText}", level=${level}, filename=${filename}`
      );

      const spaceUrl = this.spaceUrl?.trim();
      if (!spaceUrl) {
        throw new Error("ARTIKULASI_AI_URL is not configured");
      }

      if (Buffer.isBuffer(audioFileOrPath)) {
        tempFilePath = path.join(
          __dirname,
          "../../uploads/videos",
          `temp_${Date.now()}_${filename}`
        );
        fs.writeFileSync(tempFilePath, audioFileOrPath);
        audioFileOrPath = tempFilePath;
      }

      if (!fs.existsSync(audioFileOrPath)) {
        throw new Error(`Audio file not found: ${audioFileOrPath}`);
      }

      console.log(`Connecting to Gradio Space: ${spaceUrl}`);
      const client = await Client.connect(spaceUrl, {
        hf_token: process.env.HF_TOKEN || undefined,
      });
      console.log(`✅ Connected to Gradio Space`);

      const fileBuffer = fs.readFileSync(audioFileOrPath);
      const fileName = path.basename(audioFileOrPath);
      const mimeType = this.getMimeType(audioFileOrPath);

      const blob = new Blob([fileBuffer], { type: mimeType });
      Object.defineProperty(blob, "name", {
        value: fileName,
        writable: false,
      });

      console.log(`Calling API: ${this.apiName}`);
      console.log(
        `File: ${fileName} (${fileBuffer.length} bytes), target="${targetText}", level=${level}`
      );

      const result = await client.predict(this.apiName, [
        blob,
        targetText,
        level,
      ]);

      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      let data = result.data;
      if (Array.isArray(data)) {
        data = data[0];
      }

      if (!data) {
        throw new Error("Invalid response from AI service");
      }

      return data.success && data.data ? data : { success: true, data };
    } catch (error) {
      console.error("Artikulasi AI Service Error:", error.message);

      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {}
      }

      if (error.message.includes("connect")) {
        throw new Error(
          "Tidak dapat terhubung ke AI Service. Pastikan Hugging Face Space sedang berjalan."
        );
      } else if (error.message.includes("timeout")) {
        throw new Error("AI Service timeout. Silakan coba lagi.");
      } else {
        throw new Error(`Error mengirim audio ke AI: ${error.message}`);
      }
    }
  }

  /**
   * Validate and normalize AI response format
   */
  validateResponse(aiResponse) {
    if (!aiResponse?.success || !aiResponse?.data) {
      throw new Error("Invalid AI response structure");
    }

    const data = aiResponse.data;

    return {
      overall_score: this.normalizeScore(data.overall?.score),
      grade: data.overall?.grade || "",
      articulation_score: this.normalizeScore(data.scores?.articulation),
      clarity_score: this.normalizeScore(data.scores?.clarity),
      energy_score: this.normalizeScore(data.scores?.energy),
      speech_rate_score: this.normalizeScore(data.scores?.speech_rate),
      pitch_consistency_score: this.normalizeScore(
        data.scores?.pitch_consistency
      ),
      snr_score: this.normalizeScore(data.scores?.snr),
      detected_text: data.transcription?.detected || "",
      target_text: data.transcription?.target || "",
      similarity_score: data.transcription?.similarity ?? null,
      wer: data.transcription?.wer ?? null,
      feedback_message: data.feedback?.message || "",
      feedback_suggestions: data.feedback?.suggestions || [],
      duration_seconds: data.audio_features?.duration || null,
      ai_response: data,
    };
  }

  /**
   * Normalize score to 0-100 range
   */
  normalizeScore(score) {
    if (score == null) return 0;
    const numScore = parseFloat(score);
    return isNaN(numScore) ? 0 : Math.max(0, Math.min(100, numScore));
  }

  /**
   * Calculate average score from multiple assessments
   */
  calculateLevelScore(assessments) {
    if (!assessments?.length) {
      return {
        total_score: 0,
        articulation_score: 0,
        clarity_score: 0,
        total_materials: 0,
        passed_materials: 0,
      };
    }

    const sum = assessments.reduce(
      (acc, assessment) => {
        acc.overall += assessment.overall_score || 0;
        acc.articulation += assessment.articulation_score || 0;
        acc.clarity += assessment.clarity_score || 0;
        if (assessment.overall_score >= 70) acc.passed++;
        return acc;
      },
      { overall: 0, articulation: 0, clarity: 0, passed: 0 }
    );

    const total = assessments.length;
    return {
      total_score: parseFloat((sum.overall / total).toFixed(2)),
      articulation_score: parseFloat((sum.articulation / total).toFixed(2)),
      clarity_score: parseFloat((sum.clarity / total).toFixed(2)),
      total_materials: total,
      passed_materials: sum.passed,
    };
  }

  /**
   * Get grade based on score
   */
  getGrade(score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "E";
  }
}

module.exports = new ArtikulasiAiService();
