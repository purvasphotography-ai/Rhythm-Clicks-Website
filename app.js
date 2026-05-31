document.addEventListener('DOMContentLoaded', () => {

  // Force scroll to the top (first page) on fresh load / refresh, disabling browser scroll restoration
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  
  window.scrollTo(0, 0);
  
  // Clear any hash on load so it doesn't scroll on next reload
  if (window.location.hash) {
    history.replaceState("", document.title, window.location.pathname + window.location.search);
  }

  /* ==========================================================================
     1. Navigation Scroll Effect & Active States
     ========================================================================== */
  const header = document.getElementById('header');
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-menu .nav-link, .mobile-nav .nav-link, .mobile-bottom-nav-item');

  // Cache section bounds to prevent forced reflows during scroll
  let cachedSections = [];
  let cachedHeroBounds = { top: 0, bottom: 0 };
  let cachedFooterTop = 0;

  const cacheSectionBounds = () => {
    cachedSections = Array.from(sections).map(section => ({
      id: section.getAttribute('id'),
      top: section.offsetTop - 120,
      height: section.clientHeight
    }));

    const hero = document.getElementById('home');
    if (hero) {
      cachedHeroBounds.top = hero.offsetTop;
      cachedHeroBounds.bottom = cachedHeroBounds.top + hero.clientHeight;
    }

    const footer = document.querySelector('footer');
    if (footer) {
      cachedFooterTop = footer.offsetTop;
    }
  };

  // Run initial cache
  cacheSectionBounds();

  // Sliding Liquid Glass Pill Indicator for Navigation Menu
  const navMenuUl = document.querySelector('.nav-menu ul');
  let indicator = null;
  
  if (navMenuUl) {
    indicator = document.createElement('li');
    indicator.className = 'nav-indicator-pill';
    navMenuUl.appendChild(indicator);
  }

  // Sliding Liquid Glass Pill Indicator for Mobile Bottom Navigation
  const mobileBottomNav = document.querySelector('.mobile-bottom-nav');
  let mobileIndicator = null;

  if (mobileBottomNav) {
    mobileIndicator = document.createElement('div');
    mobileIndicator.className = 'mobile-nav-indicator-pill';
    mobileBottomNav.appendChild(mobileIndicator);
  }

  const updateIndicator = () => {
    // 1. Desktop indicator
    if (indicator && navMenuUl) {
      const activeLink = document.querySelector('.nav-menu .nav-link.active');
      if (activeLink) {
        const activeRect = activeLink.getBoundingClientRect();
        const parentRect = navMenuUl.getBoundingClientRect();
        
        indicator.style.opacity = '1';
        indicator.style.left = `${activeRect.left - parentRect.left}px`;
        indicator.style.width = `${activeRect.width}px`;
        indicator.style.height = `${activeRect.height}px`;
        indicator.style.top = `${activeRect.top - parentRect.top}px`;
      } else {
        indicator.style.opacity = '0';
      }
    }

    // 2. Mobile bottom nav indicator
    if (mobileIndicator && mobileBottomNav) {
      const activeMobileLink = document.querySelector('.mobile-bottom-nav-item.active');
      if (activeMobileLink) {
        const activeRect = activeMobileLink.getBoundingClientRect();
        const parentRect = mobileBottomNav.getBoundingClientRect();
        
        mobileIndicator.style.opacity = '1';
        mobileIndicator.style.left = `${activeRect.left - parentRect.left}px`;
        mobileIndicator.style.width = `${activeRect.width}px`;
        mobileIndicator.style.height = `${activeRect.height}px`;
        mobileIndicator.style.top = `${activeRect.top - parentRect.top}px`;
      } else {
        mobileIndicator.style.opacity = '0';
      }
    }
  };

  // Run on scroll, resize and initial load
  let activeLinkClass = '';
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    // Header Scroll State Toggle
    if (scrollY > 50) {
      if (!header.classList.contains('scrolled')) {
        header.classList.add('scrolled');
      }
    } else {
      if (header.classList.contains('scrolled')) {
        header.classList.remove('scrolled');
      }
    }

    // Dynamic Theme Toggling based on cached section backgrounds (Dark vs Light)
    const isDarkBackgroundAt = (yPosition) => {
      // Hero section check
      if (yPosition >= cachedHeroBounds.top && yPosition < cachedHeroBounds.bottom) {
        return true;
      }
      // Footer check
      if (yPosition >= cachedFooterTop) {
        return true;
      }
      return false;
    };

    const headerIsDark = isDarkBackgroundAt(scrollY + 40);
    const bottomNavIsDark = isDarkBackgroundAt(scrollY + window.innerHeight - 50);

    // Apply header theme class
    if (headerIsDark) {
      header.classList.add('theme-dark');
      header.classList.remove('theme-light');
    } else {
      header.classList.add('theme-light');
      header.classList.remove('theme-dark');
    }

    // Apply bottom nav theme class
    if (mobileBottomNav) {
      if (bottomNavIsDark) {
        mobileBottomNav.classList.add('theme-dark');
        mobileBottomNav.classList.remove('theme-light');
      } else {
        mobileBottomNav.classList.add('theme-light');
        mobileBottomNav.classList.remove('theme-dark');
      }
    }

    // Dynamic Navigation Highlighting from cached bounds
    let current = '';
    for (let i = 0; i < cachedSections.length; i++) {
      const s = cachedSections[i];
      if (scrollY >= s.top && scrollY < s.top + s.height) {
        current = s.id;
      }
    }
    if (!current && scrollY < 100) {
      current = 'home';
    }

    // Only update DOM classes and pill indicator if active section changed
    if (activeLinkClass !== current) {
      activeLinkClass = current;

      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const isMatch = (href.substring(1) === current) || (current === 'home' && href === '#');
        if (isMatch) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      updateIndicator();
    }
  });

  window.addEventListener('resize', () => {
    cacheSectionBounds();
    updateIndicator();
  });
  
  // Set initial active state and pill position after browser layout finishes
  setTimeout(() => {
    cacheSectionBounds();
    window.dispatchEvent(new Event('scroll'));
  }, 200);

  // Recalculate bounds once window completely loads (inc. delayed images)
  window.addEventListener('load', () => {
    cacheSectionBounds();
    window.dispatchEvent(new Event('scroll'));
  });

  /* ==========================================================================
     2. Mobile Drawer Navigation
     ========================================================================== */
  const hamburger = document.getElementById('hamburger-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  const toggleMobileMenu = () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  };

  hamburger.addEventListener('click', toggleMobileMenu);

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (mobileMenu.classList.contains('open')) {
        toggleMobileMenu();
      }
    });
  });

  /* ==========================================================================
     3. Hero Slideshow Rotating Background (Lazy Loaded)
     ========================================================================== */
  const slides = document.querySelectorAll('.hero-slide');
  let currentSlide = 0;
  const slideInterval = 5000; // 5 seconds

  const loadSlideBg = (slide) => {
    if (slide && slide.dataset.src && !slide.src) {
      slide.src = slide.dataset.src;
    }
  };

  const nextSlide = () => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    
    // Load next slide background image before showing it
    loadSlideBg(slides[currentSlide]);
    
    // Preload the next-next slide background image for a smooth transition
    const nextNextIdx = (currentSlide + 1) % slides.length;
    loadSlideBg(slides[nextNextIdx]);
    
    slides[currentSlide].classList.add('active');
  };

  if (slides.length > 1) {
    // Delay loading the second slide slightly to prioritize initial critical path load
    setTimeout(() => {
      loadSlideBg(slides[1]);
    }, 1500);
    setInterval(nextSlide, slideInterval);
  }

  // Smooth scroll helper for Scroll Down indicator
  const scrollIndicator = document.getElementById('scroll-to-about');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
      const aboutSection = document.getElementById('about');
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ==========================================================================
     4. Scroll Reveal Animations (Intersection Observer)
     ========================================================================== */
  const revealElements = document.querySelectorAll('.reveal');
  
  if (window.location.protocol === 'file:') {
    // Force activate all sections immediately on local filesystem view to bypass browser security restrictions
    revealElements.forEach(element => {
      element.classList.add('active');
    });
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObserver.unobserve(entry.target); // Reveal only once
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(element => {
      revealObserver.observe(element);
    });
  }

  /* ==========================================================================
     5. Portfolio Category Filter & Custom Lightbox Navigation (Dynamic)
     ========================================================================== */
  const filterButtons = document.querySelectorAll('.filter-btn');
  const portfolioContainer = document.getElementById('portfolio-container');
  const lightbox = document.getElementById('custom-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCategory = document.getElementById('lightbox-category');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  let activeGalleryItems = [];
  let currentImgIndex = 0;
  let currentFilter = 'all';
  let currentLimit = 9;

  const openLightbox = (index) => {
    if (activeGalleryItems.length === 0) return;
    currentImgIndex = index;
    const currentItem = activeGalleryItems[currentImgIndex];
    
    lightboxImg.setAttribute('src', currentItem.src);
    lightboxImg.setAttribute('alt', currentItem.caption);
    lightboxCaption.innerHTML = currentItem.desc;
    lightboxCategory.textContent = currentItem.category.replace('-', ' ');

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  const navigateLightbox = (direction) => {
    if (activeGalleryItems.length === 0) return;
    
    if (direction === 'next') {
      currentImgIndex = (currentImgIndex + 1) % activeGalleryItems.length;
    } else {
      currentImgIndex = (currentImgIndex - 1 + activeGalleryItems.length) % activeGalleryItems.length;
    }
    
    // Smooth swap animation on image inside lightbox
    lightboxImg.style.opacity = '0';
    lightboxImg.style.transform = 'scale(0.97)';
    
    setTimeout(() => {
      openLightbox(currentImgIndex);
      lightboxImg.style.opacity = '1';
      lightboxImg.style.transform = 'scale(1)';
    }, 200);
  };

  const interleaveCategories = (items) => {
    const groups = {};
    items.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    const categories = Object.keys(groups);
    const mixed = [];
    let maxLen = 0;
    
    categories.forEach(cat => {
      if (groups[cat].length > maxLen) {
        maxLen = groups[cat].length;
      }
    });

    for (let i = 0; i < maxLen; i++) {
      categories.forEach(cat => {
        if (i < groups[cat].length) {
          mixed.push(groups[cat][i]);
        }
      });
    }
    return mixed;
  };

  const renderGallery = (appendOnly = false) => {
    if (!portfolioContainer) return;
    
    const data = typeof GALLERY_DATA !== 'undefined' ? GALLERY_DATA : [];
    
    if (data.length === 0) {
      portfolioContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-lg) 0;">
          <p class="lead" style="margin: 0 auto;">No gallery images found.</p>
          <p style="font-size: 0.9rem; color: var(--text-light); margin-top: 10px;">Please put images inside assets/gallery/ subfolders and run update_gallery.py</p>
        </div>
      `;
      return;
    }

    let filteredData = [];
    if (currentFilter === 'all') {
      filteredData = interleaveCategories(data);
    } else {
      filteredData = data.filter(item => item.category === currentFilter);
    }
    const totalMatching = filteredData.length;

    let startIdx = 0;
    if (appendOnly) {
      startIdx = activeGalleryItems.length;
    } else {
      portfolioContainer.innerHTML = '';
      activeGalleryItems = [];
    }

    const endIdx = Math.min(currentLimit, totalMatching);
    const itemsToRender = filteredData.slice(startIdx, endIdx);

    let html = '';
    itemsToRender.forEach((item, idx) => {
      const globalIndex = startIdx + idx;
      const catClean = item.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      html += `
        <div class="portfolio-item fade-in" data-index="${globalIndex}">
          <img src="${item.src}" alt="${item.caption}" class="portfolio-image" width="400" height="500" loading="lazy">
          <div class="portfolio-overlay">
            <div class="portfolio-info">
              <span>${catClean}</span>
              <span class="portfolio-view-btn">View Image</span>
            </div>
          </div>
        </div>
      `;
    });

    if (html) {
      portfolioContainer.insertAdjacentHTML('beforeend', html);
    }

    activeGalleryItems = filteredData.slice(0, endIdx);

    // Show/hide Load More button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      if (totalMatching > currentLimit) {
        loadMoreBtn.style.display = 'inline-flex';
      } else {
        loadMoreBtn.style.display = 'none';
      }
    }
  };

  const setupPortfolioEvents = () => {
    // Setup event delegation for portfolio container
    if (portfolioContainer) {
      portfolioContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.portfolio-item');
        if (item) {
          const index = parseInt(item.getAttribute('data-index'), 10);
          if (!isNaN(index) && index >= 0 && index < activeGalleryItems.length) {
            openLightbox(index);
          }
        }
      });
    }

    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(button => button.classList.remove('active'));
        e.target.classList.add('active');

        currentFilter = e.target.getAttribute('data-filter');
        currentLimit = 9;
        renderGallery(false);
      });
    });

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        currentLimit += 9;
        renderGallery(true);
      });
    }
  };

  // Run the gallery population
  renderGallery(false);
  setupPortfolioEvents();




  // Lightbox Event Listeners
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', () => navigateLightbox('next'));
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => navigateLightbox('prev'));
  
  // Close on clicking backdrop overlay directly (excluding content)
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Keyboard navigation support
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      navigateLightbox('next');
    } else if (e.key === 'ArrowLeft') {
      navigateLightbox('prev');
    }
  });



  /* ==========================================================================
     7. Testimonials Slider Carousel
     ========================================================================== */
  const testimonialSlides = document.querySelectorAll('.testimonial-slide');
  const dotsContainer = document.getElementById('slider-dots');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');
  let currentTestimonial = 0;

  // Generate dots dynamically to match slide count
  if (dotsContainer && testimonialSlides.length > 0) {
    dotsContainer.innerHTML = '';
    testimonialSlides.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.classList.add('dot');
      if (idx === 0) dot.classList.add('active');
      dot.setAttribute('data-index', idx);
      dotsContainer.appendChild(dot);
    });
  }

  const testimonialDots = document.querySelectorAll('#slider-dots .dot');

  const showTestimonial = (index) => {
    testimonialSlides.forEach(slide => slide.classList.remove('active'));
    testimonialDots.forEach(dot => dot.classList.remove('active'));
    
    if (testimonialSlides[index]) testimonialSlides[index].classList.add('active');
    if (testimonialDots[index]) testimonialDots[index].classList.add('active');
    currentTestimonial = index;
  };

  const nextTestimonial = () => {
    let nextIdx = (currentTestimonial + 1) % testimonialSlides.length;
    showTestimonial(nextIdx);
  };

  const prevTestimonial = () => {
    let prevIdx = (currentTestimonial - 1 + testimonialSlides.length) % testimonialSlides.length;
    showTestimonial(prevIdx);
  };

  if (nextBtn && prevBtn) {
    nextBtn.addEventListener('click', nextTestimonial);
    prevBtn.addEventListener('click', prevTestimonial);
  }

  // Dots click support
  testimonialDots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      showTestimonial(idx);
    });
  });

  // Optional: Auto play testimonials
  let testimonialTimer = setInterval(nextTestimonial, 8000);
  
  const resetTestimonialTimer = () => {
    clearInterval(testimonialTimer);
    testimonialTimer = setInterval(nextTestimonial, 8000);
  };

  if (nextBtn && prevBtn) {
    [nextBtn, prevBtn].forEach(btn => btn.addEventListener('click', resetTestimonialTimer));
  }
  testimonialDots.forEach(dot => dot.addEventListener('click', resetTestimonialTimer));

  /* ==========================================================================
     8. Contact Inquiry Form Validation & Success Handling
     ========================================================================== */
  const bookingForm = document.getElementById('booking-form');
  const successModal = document.getElementById('form-success-modal');
  const successMsgText = document.getElementById('success-message');
  const successClose = document.getElementById('success-close-btn');

  // Input fields for helper borders validation styling
  const formName = document.getElementById('form-name');
  const formEmail = document.getElementById('form-email');
  const formPhone = document.getElementById('form-phone');
  const formSession = document.getElementById('form-session-type');

  const showInputValidity = (inputElement, isValid) => {
    if (isValid) {
      inputElement.style.borderColor = ''; // Inherits clean stylesheet borders
      inputElement.style.boxShadow = '';
    } else {
      inputElement.style.borderColor = 'var(--text-primary)'; // Monochromatic dark outline for errors
      inputElement.style.boxShadow = '0 0 0 1px var(--text-primary)';
    }
  };

  // Reset helper borders on input typing
  [formName, formEmail, formPhone, formSession].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        showInputValidity(input, true);
      });
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', () => {
          showInputValidity(input, true);
        });
      }
    }
  });

  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let formIsValid = true;

      // Validate Name
      if (!formName.value.trim()) {
        showInputValidity(formName, false);
        formIsValid = false;
      } else {
        showInputValidity(formName, true);
      }

      // Validate Email (Optional)
      const emailVal = formEmail.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailVal && !emailRegex.test(emailVal)) {
        showInputValidity(formEmail, false);
        formIsValid = false;
      } else {
        showInputValidity(formEmail, true);
      }

      // Validate Phone
      if (!formPhone.value.trim()) {
        showInputValidity(formPhone, false);
        formIsValid = false;
      } else {
        showInputValidity(formPhone, true);
      }

      // Validate Session Type Select
      if (!formSession.value) {
        showInputValidity(formSession, false);
        formIsValid = false;
      } else {
        showInputValidity(formSession, true);
      }

      if (!formIsValid) {
        return; // stop execution if form not filled correctly
      }

      // Construct WhatsApp message and open link
      const waName = formName.value.trim();
      const waEmail = formEmail.value.trim() || 'Not specified';
      const waPhone = formPhone.value.trim();
      const waSession = formSession.options[formSession.selectedIndex].text;
      const formDate = document.getElementById('form-date');
      const formMessage = document.getElementById('form-message');
      const waDate = (formDate && formDate.value) ? formDate.value : 'Not specified';
      const waMsg = (formMessage && formMessage.value.trim()) ? formMessage.value.trim() : 'None';

      const waMessageText = `Hello Rhythm Clicks Studio!\n\nI would like to book a photography session. Here are my details:\n\n• *Name:* ${waName}\n• *Email:* ${waEmail}\n• *Phone:* ${waPhone}\n• *Session:* ${waSession}\n• *Preferred Date:* ${waDate}\n• *Details/Milestones:* ${waMsg}`;
      const waUrl = `https://wa.me/919712701002?text=${encodeURIComponent(waMessageText)}`;
      
      // Open WhatsApp in a new tab
      window.open(waUrl, '_blank');

      // Success Path! Construct custom greeting message
      const userName = waName.split(' ')[0]; // First name
      successMsgText.innerHTML = `Thank you, <strong>${userName}</strong>! We have opened WhatsApp to send your inquiry for the <strong>${waSession}</strong> directly to our team. Let's create beautiful memories together!`;
      
      // Open Success Modal
      successModal.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Clear Form Fields
      bookingForm.reset();
    });
  }
  // Close Success Modal
  if (successClose) {
    successClose.addEventListener('click', () => {
      successModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  
  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        successModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }


});
