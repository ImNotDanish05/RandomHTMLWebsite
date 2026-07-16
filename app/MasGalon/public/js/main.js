// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Initialize Lucide Icons
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. GSAP Animations (only if reduced motion is disabled)
  if (!prefersReducedMotion) {
    // Navbar slide down
    gsap.from('.navbar', {
      y: -80,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    // Hero elements stagger in
    gsap.from('.hero-content > *', {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
      delay: 0.2
    });

    // Hero phone mockup scale & fade-in
    gsap.from('.phone-frame', {
      scale: 0.9,
      opacity: 0,
      duration: 1.2,
      ease: 'power4.out',
      delay: 0.4
    });

    // Floating badges pop-in
    gsap.from('.floating-badge', {
      scale: 0,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: 'back.out(1.7)',
      delay: 0.8
    });

    // --- SCROLLTRIGGER REVEAL ANIMATIONS ---

    // Download Section Reveal (Page 2: Slide up from bottom)
    gsap.from('#download .container', {
      scrollTrigger: {
        trigger: '#download',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      y: 150,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    });

    // Features Section Reveal (Page 3: Slide right from left)
    gsap.from('#fitur .container', {
      scrollTrigger: {
        trigger: '#fitur',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      x: -150,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    });

    // Guide Section Reveal (Page 4: Slide left from right)
    gsap.from('#panduan .container', {
      scrollTrigger: {
        trigger: '#panduan',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      x: 150,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    });

    // FAQ Section Reveal (Page 5: Slide up from bottom)
    gsap.from('#faq .container', {
      scrollTrigger: {
        trigger: '#faq',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      y: 150,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    });
  }

  // 2. Navbar Scroll Behavior
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // 3. Mobile Navigation Menu Toggle
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const iconMenu = menuToggle.querySelector('.icon-menu');
  const iconClose = menuToggle.querySelector('.icon-close');

  menuToggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    if (isOpen) {
      iconMenu.classList.add('hidden');
      iconClose.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // Disable page scrolling
    } else {
      iconMenu.classList.remove('hidden');
      iconClose.classList.add('hidden');
      document.body.style.overflow = ''; // Enable page scrolling
    }
  });

  // Close mobile nav when clicking a link
  const mobileLinks = document.querySelectorAll('.mobile-link, .mobile-btn');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      iconMenu.classList.remove('hidden');
      iconClose.classList.add('hidden');
      document.body.style.overflow = '';
    });
  });

  // 4. Tab Switcher Logic with animations
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const phoneImg = document.querySelector('.phone-screen-img');

  function setActiveTab(selectedTab) {
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${selectedTab}"]`);
    if (!activeBtn) return;

    // Update active state of buttons
    tabBtns.forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');

    // Toggle tab contents
    tabContents.forEach(content => {
      if (content.id === `tab-${selectedTab}`) {
        content.classList.add('active');
        if (!prefersReducedMotion) {
          gsap.fromTo(content, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
          );
        }
      } else {
        content.classList.remove('active');
      }
    });

    // Subtle phone mockup interaction: skew and scale effect on tab change
    if (!prefersReducedMotion) {
      gsap.fromTo(phoneImg, 
        { scale: 0.95, opacity: 0.8 }, 
        { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' }
      );
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTab = btn.getAttribute('data-tab');
      setActiveTab(selectedTab);
    });
  });

  // 4b. Smooth Scroll and Snapping Fix for Links
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;

      e.preventDefault();

      let targetElement = document.querySelector(targetId);

      // Handle Hero buttons specifically
      if (targetId === '#download-customer') {
        setActiveTab('customer');
        targetElement = document.getElementById('download');
      } else if (targetId === '#download-mitra') {
        setActiveTab('mitra');
        targetElement = document.getElementById('download');
      }

      if (targetElement) {
        // Temporarily disable scroll snapping on desktop to prevent overshooting
        document.documentElement.style.scrollSnapType = 'none';

        // Calculate offset position (80px is navbar height)
        const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - 80;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Re-enable scroll snapping after smooth scroll completes (800ms)
        setTimeout(() => {
          document.documentElement.style.scrollSnapType = '';
        }, 800);
      }
    });
  });

  // 5. FAQ Accordion with smooth height computation
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(button => {
    button.addEventListener('click', () => {
      const faqItem = button.parentElement;
      const answer = faqItem.querySelector('.faq-answer');
      const isExpanded = button.getAttribute('aria-expanded') === 'true';

      // Close all other FAQs
      faqQuestions.forEach(otherButton => {
        if (otherButton !== button) {
          const otherItem = otherButton.parentElement;
          const otherAnswer = otherItem.querySelector('.faq-answer');
          otherItem.classList.remove('active');
          otherButton.setAttribute('aria-expanded', 'false');
          otherAnswer.style.maxHeight = '0px';
        }
      });

      // Toggle current FAQ
      if (isExpanded) {
        faqItem.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = '0px';
      } else {
        faqItem.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      }
    });
  });
});
