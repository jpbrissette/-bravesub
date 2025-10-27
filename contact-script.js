    document.addEventListener('DOMContentLoaded', () => {
        const contactForm = document.getElementById('contact-form');
        const contactMessage = document.getElementById('contact-message');
        const submitButton = document.getElementById('contact-submit-btn');
        
        if (submitButton) {
            submitButton.addEventListener('click', async () => {
                const originalButtonText = submitButton.textContent;
                
                // Get form values
                const nameInput = document.getElementById('contact-name');
                const emailInput = document.getElementById('contact-email');
                const messageInput = document.getElementById('contact-message-text');
                const accessKeyInput = document.getElementById('access_key');
                
                const name = nameInput?.value || '';
                const email = emailInput?.value || '';
                const message = messageInput?.value || '';
                const accessKey = accessKeyInput?.value || '';
                
                // Basic validation
                if (!name || !email || !message) {
                    contactMessage.style.color = '#ff6b6b';
                    contactMessage.textContent = '❌ Please fill in all fields';
                    return;
                }
                
                // Disable button and show loading state
                submitButton.disabled = true;
                submitButton.textContent = 'Sending...';
                contactMessage.textContent = '';
                contactMessage.style.color = '#ffd93d';
                contactMessage.textContent = '📤 Sending your message...';
                
                // Build data object for JSON submission
                const payload = {
                    access_key: accessKey,
                    name: name,
                    email: email,
                    message: message
                };
                
                try {
                    // Submit to Web3Forms API as JSON
                    const response = await fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Success
                        contactMessage.style.color = '#6bcf7f';
                        contactMessage.textContent = '✅ Message sent successfully! I\'ll get back to you soon.';
                        
                        // Clear form
                        if (nameInput) nameInput.value = '';
                        if (emailInput) emailInput.value = '';
                        if (messageInput) messageInput.value = '';
                        
                        // Clear success message after 5 seconds
                        setTimeout(() => {
                            contactMessage.textContent = '';
                        }, 5000);
                    } else {
                        // API returned error
                        throw new Error(data.message || 'Failed to send message');
                    }
                    
                } catch (error) {
                    // Error handling
                    contactMessage.style.color = '#ff6b6b';
                    
                    // Show specific error messages
                    if (error.message.includes('Failed to fetch')) {
                        contactMessage.textContent = '❌ Unable to send message. Please try again or email me directly.';
                    } else if (error.message.includes('Access Key') || error.message.includes('access_key')) {
                        contactMessage.textContent = '❌ Configuration error. Please contact the site administrator.';
                    } else {
                        contactMessage.textContent = `❌ Error: ${error.message}`;
                    }
                } finally {
                    // Re-enable button
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            });
        }
