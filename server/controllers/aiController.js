const pdfParse = require("pdf-parse");

const transformNotes = async (req, res) => {
    try {
        const { notes, taskTitle, cardCount = 3, file } = req.body;
        const apiKey = req.headers["x-groq-key"];

        if (!apiKey || !apiKey.trim() || apiKey.trim() === "null") {
            return res.status(400).json({
                success: false,
                message: "Groq API Key is required. Please paste your API key in the field provided in the Flashcards panel."
            });
        }

        let extractedPdfText = "";
        if (file && file.data) {
            try {
                // Extract base64 segment
                const base64Data = file.data.split(";base64,").pop();
                const fileBuffer = Buffer.from(base64Data, "base64");
                const parser = new pdfParse.PDFParse({ data: fileBuffer });
                const pdfData = await parser.getText();
                extractedPdfText = pdfData.text || "";
            } catch (pdfErr) {
                console.error("PDF Parsing Error:", pdfErr);
                return res.status(400).json({
                    success: false,
                    message: "Failed to parse PDF document text: " + pdfErr.message
                });
            }
        }

        const combinedContent = `
[PASTED NOTES TEXT]:
${notes ? notes.trim() : "(None pasted)"}

[EXTRACTED REFERENCE FILE CONTENT (${file ? file.name : "None"})]:
${extractedPdfText ? extractedPdfText.trim() : "(No file content)"}
        `.trim();

        if (!notes?.trim() && !extractedPdfText?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter study notes text or upload a text-readable PDF file."
            });
        }

        const systemPrompt = `You are a strict JSON-only API. You extract study summaries and study flashcards from notes.
You must output a single, raw, valid JSON object matching the following structure:
{
  "summary": "A detailed 1-paragraph summary of the key concepts and preparation objectives.",
  "cards": [
    {
      "front": "A clear, concise review question testing a specific fact, formula, or concept.",
      "back": "The direct, accurate, and concise answer to that question."
    }
  ]
}
You must generate exactly ${cardCount} flashcards in the "cards" array. Do not wrap the JSON output in markdown blocks like \`\`\`json. Return only raw, parsing-ready JSON.`;

        const userPrompt = `Target Study Task: "${taskTitle}"
Study notes and reference materials:
${combinedContent}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey.trim()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            return res.status(response.status).json({
                success: false,
                message: `Groq API responded with error status ${response.status}`,
                error: errBody
            });
        }

        const data = await response.json();
        const contentStr = data.choices?.[0]?.message?.content;
        if (!contentStr) {
            throw new Error("Empty message content returned from Groq API");
        }

        const parsedContent = JSON.parse(contentStr);

        res.status(200).json({
            success: true,
            data: parsedContent
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to transform notes using Groq API",
            error: error.message
        });
    }
};

module.exports = {
    transformNotes
};
