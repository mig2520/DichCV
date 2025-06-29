/**
 * background.js (v2.0)
 * - Tối ưu hóa listener, giữ cho service worker tinh gọn.
 * - Logic gọi API không thay đổi nhiều nhưng được bao bọc trong try-catch chặt chẽ hơn.
 */

// Mở trang tùy chọn khi người dùng nhấp vào biểu tượng của extension
chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage();
});

// Khởi tạo các mục trong menu ngữ cảnh khi cài đặt
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['geminiApiKey', 'geminiModel'], ({ geminiApiKey, geminiModel }) => {
    const isConfigured = geminiApiKey && geminiModel;
    chrome.contextMenus.create({
      id: "translateSelectedText",
      title: "Biên Dịch Convert đoạn này",
      contexts: ["selection"],
      enabled: isConfigured, // Chỉ bật khi đã cấu hình
    });
  });
});

// Cập nhật trạng thái menu ngữ cảnh khi cài đặt thay đổi
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.geminiApiKey || changes.geminiModel)) {
      chrome.storage.sync.get(['geminiApiKey', 'geminiModel'], ({ geminiApiKey, geminiModel }) => {
          const isConfigured = geminiApiKey && geminiModel;
          chrome.contextMenus.update("translateSelectedText", {
              enabled: isConfigured,
          });
      });
  }
});


// Xử lý khi người dùng nhấp vào mục trong menu ngữ cảnh
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelectedText" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TRANSLATE_SELECTION_REQUEST',
      text: info.selectionText
    });
  }
});

/**
 * Hàm chính thực hiện gọi API Gemini theo phương thức streaming.
 * @param {string} text - Đoạn văn bản cần dịch.
 * @param {object} options - Các tùy chọn bao gồm apiKey, model, tabId, và context.
 */
async function streamTranslate(text, { apiKey, model, tabId, context }) {
  const PROMPT = `Bạn là một dịch giả chuyên nghiệp, chuyên biên dịch nội dung của các truyện sang tiếng Việt, mượt mà, giàu cảm xúc, theo phong cách truyện dịch Trung Quốc. Hãy dịch đoạn văn bản sau đây và chỉ trả về nội dung đã dịch, không thêm bất kỳ lời giải thích nào khác:\n\n"${text}"`;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }] }],
        safetySettings: [ // Cấu hình an toàn để tránh bị chặn
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Lỗi API (${response.status}): ${errorData.error?.message || 'Không có chi tiết'}`);
    }
    
    // Gửi tín hiệu bắt đầu stream về content script
    await chrome.tabs.sendMessage(tabId, { type: 'STREAM_START', context });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // Kiểm tra xem tab có còn tồn tại không trước khi gửi message
      const tabExists = await chrome.tabs.get(tabId).catch(() => null);
      if (!tabExists) {
        console.log("Tab đã đóng, dừng stream.");
        reader.cancel(); // Dừng việc đọc stream
        break;
      }
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.substring(6));
            if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
              await chrome.tabs.sendMessage(tabId, { type: 'STREAM_CHUNK', chunk: parsed.candidates[0].content.parts[0].text, context });
            }
          } catch (e) { 
            // Bỏ qua lỗi parse JSON cho các chunk chưa hoàn chỉnh, đây là hành vi bình thường của stream
          }
        }
      }
    }
    await chrome.tabs.sendMessage(tabId, { type: 'STREAM_END', context });
  } catch (error) {
     // Gửi lỗi về lại content script kèm theo context để xử lý đúng chỗ
     await chrome.tabs.sendMessage(tabId, { type: 'TRANSLATE_ERROR', error: error.message, context: context });
  }
}

// Lắng nghe các yêu cầu dịch từ content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PERFORM_STREAM_TRANSLATION') {
    // Sử dụng hàm async để xử lý bất đồng bộ
    (async () => {
      try {
        const { geminiApiKey, geminiModel } = await chrome.storage.sync.get(['geminiApiKey', 'geminiModel']);
        if (!geminiApiKey || !geminiModel) {
          throw new Error("Vui lòng cấu hình API Key và Model trong trang Tùy chọn của extension.");
        }
        await streamTranslate(request.text, { 
          apiKey: geminiApiKey, 
          model: geminiModel, 
          tabId: sender.tab.id, 
          context: request.context // Truyền context để content.js biết đang dịch cho phần nào
        });
      } catch (error) {
        // Gửi lỗi về lại tab yêu cầu
        chrome.tabs.sendMessage(sender.tab.id, { type: 'TRANSLATE_ERROR', error: error.message, context: request.context });
      }
    })();
    // Return true để chỉ ra rằng chúng ta sẽ trả lời một cách bất đồng bộ
    return true; 
  }
});
