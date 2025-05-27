       // Add click animations and active state management for navigation links
        document.addEventListener('DOMContentLoaded', function() {
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Remove active class from all links
                    navLinks.forEach(l => l.classList.remove('active'));
                    
                    // Add active class to clicked link
                    this.classList.add('active');
                    
                    // Create ripple effect
                    createRipple(e, this);
                });
            });
            
            // Sign-in button click effect
            const signInBtn = document.querySelector('.sign-in-btn');
            signInBtn.addEventListener('click', function(e) {
                createButtonRipple(e, this);
            });
            
            // All other buttons click effects
            const buttons = document.querySelectorAll('.hero-btn, .buy-more-btn');
            buttons.forEach(button => {
                button.addEventListener('click', function(e) {
                    createButtonRipple(e, this);
                });
            });
        });
        
        function createRipple(event, element) {
            const ripple = document.createElement('span');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: radial-gradient(circle, rgba(179, 202, 228, 0.6) 0%, transparent 70%);
                border-radius: 50%;
                pointer-events: none;
                transform: scale(0);
                animation: rippleAnimation 0.6s linear;
                z-index: 0;
            `;
            
            element.style.position = 'relative';
            element.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        }
        
        function createButtonRipple(event, element) {
            const ripple = document.createElement('span');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 1.5;
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
                border-radius: 50%;
                pointer-events: none;
                transform: scale(0);
                animation: rippleAnimation 0.8s ease-out;
                z-index: 0;
            `;
            
            element.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 800);
        }
