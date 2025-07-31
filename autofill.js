//
Example: Autofill
for Indeed job application page
    (function() {
        // Dummy resume data (you would pull this from your extension's popup or storage)
        const resumeData = {
            name: "John Smith",
            email: "john.smith@example.com",
            phone: "0400 123 456",
            resumeText: "Experienced software developer with skills in JavaScript, React, Node.js"
        };

        // Fill out fields on Indeed (selectors can change — inspect the form on the page)
        const nameField = document.querySelector('input[name="applicant.name"]');
        const emailField = document.querySelector('input[name="applicant.email"]');
        const phoneField = document.querySelector('input[name="applicant.phoneNumber"]');
        const resumeField = document.querySelector('textarea[name="resume.text"]');

        if (nameField) nameField.value = resumeData.name;
        if (emailField) emailField.value = resumeData.email;
        if (phoneField) phoneField.value = resumeData.phone;
        if (resumeField) resumeField.value = resumeData.resumeText;

        console.log("✅ Autofill complete on this page.");
    })();

chrome.storage.sync.get(["resumeData"], function(result) {
    const data = result.resumeData;
    if (!data) return;

    document.querySelector('input[name="name"]').value = data.name || "";
    document.querySelector('input[name="email"]').value = data.email || "";
    document.querySelector('input[name="phone"]').value = data.phone || "";
    document.querySelector('textarea[name="summary"]').value = data.summary || "";
});