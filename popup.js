// Get references to the necessary DOM elements
const promptInput = document.getElementById('promptInput');
const sendQueryBtn = document.getElementById('sendQueryBtn');
const responseDisplay = document.getElementById('responseDisplay');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const xmlFileInput = document.getElementById('xmlFileInput');

// Function to extract URLs from text and format them as a list
function extractAndFormatUrls(text) {  
    const urlRegex = /(https?:\/\/[^\s]+)/g;  
    const matches = text.match(urlRegex);

      
    if (matches && matches.length > 0) {    
        const ul = document.createElement('ul');    
        ul.classList.add('list-disc', 'pl-5', 'space-y-1');

            
        matches.forEach(url => {      
            const li = document.createElement('li');      
            const a = document.createElement('a');      
            a.href = url;      
            a.textContent = url;      
            a.target = '_blank';      
            a.rel = 'noopener noreferrer';      
            a.classList.add('text-blue-600', 'hover:underline');      
            li.appendChild(a);      
            ul.appendChild(li);    
        });    
        return ul;  
    } else {     // Remove this fallback if you only want links
             return document.createTextNode('');   }
}

function openJobSites(profile) {
    const encodedTitle = encodeURIComponent(profile.title);
    const encodedLocation = encodeURIComponent(profile.location || '');

    const jobUrls = [
        `https://www.seek.com.au/${encodedTitle}-jobs/in-${encodedLocation}`,
        `https://au.jora.com/${encodedTitle}-jobs-in-${encodedLocation}`,
        `https://www.careerone.com.au/jobs?q=${encodedTitle}&where=${encodedLocation}`,
        `https://www.adzuna.com.au/search?q=${encodedTitle}&loc=${encodedLocation}`,
        `https://www.linkedin.com/jobs/search/?keywords=${encodedTitle}&location=${encodedLocation}`
    ];

    chrome.runtime.sendMessage({
        action: "openJobSites",
        urls: jobUrls
    });
}



// Add an event listener to the "Send Query" button
sendQueryBtn.addEventListener('click', async() => {
    let prompt = promptInput.value.trim(); // Get the user's input and remove whitespace

    // Clear previous results and show loading state
    responseDisplay.textContent = 'Generating response...';
    errorMessage.classList.add('hidden'); // Hide any previous error messages
    loadingIndicator.classList.remove('hidden'); // Show the loading indicator
    sendQueryBtn.disabled = true; // Disable the button to prevent multiple clicks

    // Validate if the prompt is empty
    if (!prompt) {
        errorText.textContent = 'Please enter a prompt or upload an XML file before sending a query.';
        errorMessage.classList.remove('hidden');
        responseDisplay.textContent = 'No response yet. Enter a prompt or upload a file.';
        loadingIndicator.classList.add('hidden');
        sendQueryBtn.disabled = false;
        return; // Stop execution if no prompt is provided
    }

    // Prepend the desired message to the prompt
    prompt = `
                Based on this resume, extract the candidate's professional profile including:
                - Job title or target role
                - Location (if available)
                - Key skills or qualifications

                Then return ONLY a JSON object like this:
                {
                "title": "...",
                "location": "...",
                "skills": ["...", "..."]
                }
                Resume content:
                """${prompt}"""
                `;

    try {
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };

        // IMPORTANT: Replace with your actual Gemini API key from Google AI Studio.
        // DO NOT hardcode sensitive API keys directly in client-side code for production.
        // For a real-world extension, consider more secure ways to handle keys (e.g., a backend, or user input).
        const apiKey = "AIzaSyA6_fiOkjdtlkZs3dh9jITiGRVX4ndCZAE"; // 👈 REPLACE THIS!
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error.message || 'Unknown error'}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {

            let text = result.candidates[0].content.parts[0].text.trim();
            console.log("Gemini raw response:\n", text);

            // Remove Markdown-style code fences like ```json ... ```
            if (text.startsWith("```")) {
                text = text.replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").trim();
            }

            try {
                const profile = JSON.parse(text);
                openJobSites(profile);
            } catch (err) {
                throw new Error("Failed to parse profile JSON. Raw text:\n" + text + "\n\nError: " + err.message);
            }


            responseDisplay.innerHTML = ''; // Clear previous content
            responseDisplay.appendChild(extractAndFormatUrls(text));

        } else {
            throw new Error("Could not extract structured profile from response.");
        }


    } catch (error) {
        console.error('Error fetching from Gemini API:', error);
        errorText.textContent = `Failed to get response: ${error.message}`;
        errorMessage.classList.remove('hidden');
        responseDisplay.innerHTML = 'Error: Could not retrieve response.'; // Use innerHTML to clear
    } finally {
        loadingIndicator.classList.add('hidden');
        sendQueryBtn.disabled = false;
    }
});

// Event listener for the XML file input
xmlFileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) {
        // Clear prompt if no file is selected
        promptInput.value = '';
        return;
    }

    // Ensure it's an XML file
    if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
        errorText.textContent = "Please select a valid .xml file.";
        errorMessage.classList.remove('hidden');
        promptInput.value = ''; // Clear input if invalid file
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const xmlContent = e.target.result;
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

            // Check for parser errors
            const parserError = xmlDoc.getElementsByTagName("parsererror");
            if (parserError.length > 0) {
                errorText.textContent = "Error parsing XML from file.";
                errorMessage.classList.remove('hidden');
                promptInput.value = ''; // Clear prompt on error
                return;
            }

            // Extract text from <w:t> tags (Word text runs)
            const textElements = xmlDoc.getElementsByTagName("w:t");
            let extractedText = "";
            for (let i = 0; i < textElements.length; i++) {
                extractedText += textElements[i].textContent + " ";
            }
            // Set the extracted text to the prompt input field
            promptInput.value = extractedText.trim();
            // Clear any previous error messages if successful
            errorMessage.classList.add('hidden');
        } catch (err) {
            console.error("Error processing XML file:", err);
            errorText.textContent = "Failed to parse Word XML file: " + err.message;
            errorMessage.classList.remove('hidden');
            promptInput.value = ''; // Clear prompt on error
        }
    };

    reader.onerror = function() {
        errorText.textContent = "Failed to read file.";
        errorMessage.classList.remove('hidden');
        promptInput.value = ''; // Clear prompt on error
    };

    reader.readAsText(file);
});