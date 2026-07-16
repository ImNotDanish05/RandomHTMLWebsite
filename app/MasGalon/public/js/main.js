import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  createIcons,
  Menu,
  X,
  Download,
  ShieldCheck,
  MapPin,
  Award,
  ShoppingCart,
  Check,
  RefreshCw,
  MessageSquare,
  Bell
} from 'lucide';

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Initialize Lucide Icons
createIcons({
  icons: {
    Menu,
    X,
    Download,
    ShieldCheck,
    MapPin,
    Award,
    ShoppingCart,
    Check,
    RefreshCw,
    MessageSquare,
    Bell
  }
});

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

    // Download Section Reveal
    gsap.from('#download .section-header', {
      scrollTrigger: {
        trigger: '#download',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    gsap.from('#download .tab-switcher', {
      scrollTrigger: {
        trigger: '#download .tab-switcher',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out'
    });

    gsap.from('#download .tab-grid', {
      scrollTrigger: {
        trigger: '#download .tab-container',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    // Features Section Reveal
    gsap.from('#fitur .section-header', {
      scrollTrigger: {
        trigger: '#fitur',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    gsap.from('#fitur .feature-card', {
      scrollTrigger: {
        trigger: '#fitur .features-grid',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out'
    });

    // Guide Section Reveal
    gsap.from('#panduan .section-title, #panduan .guide-subtitle', {
      scrollTrigger: {
        trigger: '#panduan',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power2.out'
    });

    gsap.from('#panduan .step-item', {
      scrollTrigger: {
        trigger: '#panduan .steps-list',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      x: -40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out'
    });

    gsap.from('#panduan .info-card', {
      scrollTrigger: {
        trigger: '#panduan .guide-visual',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      scale: 0.9,
      opacity: 0,
      duration: 0.8,
      ease: 'back.out(1.5)'
    });

    // FAQ Section Reveal
    gsap.from('#faq .section-header', {
      scrollTrigger: {
        trigger: '#faq',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    gsap.from('#faq .faq-item', {
      scrollTrigger: {
        trigger: '#faq .faq-list',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out'
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

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTab = btn.getAttribute('data-tab');

      // Update active state of buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

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
