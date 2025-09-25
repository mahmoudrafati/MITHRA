/**
 * MITHRA Energy Label Analyzer - DOM Parser and Analyzer
 * Precise DOM-based detection for eBay energy label structures
 */

let JSDOM;
try {
    const jsdomModule = await import('jsdom');
    JSDOM = jsdomModule.JSDOM;
} catch (error) {
    console.warn('JSDOM not available, falling back to string analysis');
    JSDOM = null;
}

/**
 * DOM-based analyzer for eBay energy label detection
 * Uses DOM parsing instead of string matching for precise element detection
 */
export class DomAnalyzer {
    
    /**
     * Parse HTML string and create DOM structure
     * @param {string} htmlString - Complete HTML content
     * @returns {Document} DOM document object
     */
    parseHTML(htmlString) {
        if (!JSDOM) {
            throw new Error('JSDOM not available - cannot perform DOM analysis');
        }
        
        try {
            const dom = new JSDOM(htmlString);
            return dom.window.document;
        } catch (error) {
            console.error('Error parsing HTML:', error);
            throw new Error('Failed to parse HTML into DOM structure');
        }
    }

    /**
     * Analyze HTML for all energy label criteria
     * @param {string} htmlString - Complete HTML content
     * @returns {Object} Analysis results
     */
    analyzeEnergyLabels(htmlString) {
        const dom = this.parseHTML(htmlString);
        
        return {
            produktdatenblatt: this.checkProduktdatenblatt(dom),
            energielabel: this.checkEnergielabel(dom),
            mouseover: this.checkMouseOver(dom),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Check for Produktdatenblatt (Product Data Sheet) presence
     * Real eBay structure: .x-regulatory-wrapper > .vim.x-eek > .x-eek__values.x-eek__product-fiche > .x-eek__product-link
     * @param {Document} dom - DOM document
     * @returns {boolean} True if product data sheet link is found
     */
    checkProduktdatenblatt(dom) {
        try {
            // Check for regulatory wrapper first
            const regulatoryWrapper = dom.querySelector('.x-regulatory-wrapper');
            if (!regulatoryWrapper) {
                console.log('No .x-regulatory-wrapper found');
                return false;
            }

            // Look for vim.x-eek container (both classes must be present)
            const vimEekContainer = regulatoryWrapper.querySelector('.vim.x-eek');
            if (!vimEekContainer) {
                console.log('No .vim.x-eek container found');
                return false;
            }

            // In real eBay: .x-eek__values and .x-eek__product-fiche are SAME element (both classes)
            const productFicheValues = vimEekContainer.querySelector('.x-eek__values.x-eek__product-fiche');
            if (!productFicheValues) {
                console.log('No .x-eek__values.x-eek__product-fiche found');
                return false;
            }

            // Look for product link - check both within product fiche and vim container
            let productLink = productFicheValues.querySelector('.x-eek__product-link');
            
            if (!productLink) {
                // Try searching in the entire vim container as fallback
                productLink = vimEekContainer.querySelector('.x-eek__product-link');
            }
            
            if (!productLink) {
                console.log('No .x-eek__product-link found. Debug info:');
                // Debug: Show what we actually have
                const allLinks = vimEekContainer.querySelectorAll('a');
                console.log(`Found ${allLinks.length} total links in vim container`);
                allLinks.forEach((link, i) => {
                    console.log(`  Link ${i}: classes="${Array.from(link.classList).join(' ')}" text="${(link.textContent || '').trim().substring(0, 30)}..."`);
                });
                return false;
            }

            // Check if the link has valid href and contains "Produktdatenblatt" text
            const href = productLink.getAttribute('href');
            const linkText = productLink.textContent || productLink.innerText || '';
            
            // Exclude javascript: links (fake links)
            const hasValidHref = href && !href.includes('javascript:') && href.length > 5;
            const hasProductText = linkText.toLowerCase().includes('produktdatenblatt');

            if (hasValidHref && hasProductText) {
                console.log('Valid Produktdatenblatt link found:', { href, linkText: linkText.trim() });
                return true;
            }

            console.log('Product link found but invalid:', { 
                href, 
                linkText: linkText.trim(), 
                hasValidHref, 
                hasProductText 
            });
            return false;

        } catch (error) {
            console.error('Error checking Produktdatenblatt:', error);
            return false;
        }
    }

    /**
     * Check for Energy Label presence
     * Real eBay structure: .x-regulatory-wrapper > .vim.x-eek > .x-eek__icon-overlay-wrapper > .ux-eek-icon > .eek
     * Must exclude fake-link elements!
     * @param {Document} dom - DOM document
     * @returns {boolean} True if interactive energy label is found
     */
    checkEnergielabel(dom) {
        try {
            // Check for regulatory wrapper first
            const regulatoryWrapper = dom.querySelector('.x-regulatory-wrapper');
            if (!regulatoryWrapper) {
                console.log('No .x-regulatory-wrapper found for energy label check');
                return false;
            }

            // Look for vim.x-eek container (both classes must be present)
            const vimEekContainer = regulatoryWrapper.querySelector('.vim.x-eek');
            if (!vimEekContainer) {
                console.log('No .vim.x-eek container found');
                return false;
            }

            // Check for icon overlay wrapper (interactive element)
            const iconOverlayWrapper = vimEekContainer.querySelector('.x-eek__icon-overlay-wrapper');
            if (!iconOverlayWrapper) {
                console.log('No .x-eek__icon-overlay-wrapper found');
                return false;
            }

            // Look for ux-eek-icon (interactive energy icon)
            const uxEekIcon = iconOverlayWrapper.querySelector('.ux-eek-icon');
            if (!uxEekIcon) {
                console.log('No .ux-eek-icon found in overlay wrapper');
                return false;
            }

            // Ensure it contains actual energy rating structure (.eek element)
            const eekElement = uxEekIcon.querySelector('.eek');
            if (!eekElement) {
                console.log('No .eek element found within ux-eek-icon');
                return false;
            }

            // IMPORTANT: Exclude fake-link elements (text-only buttons)
            const fakeLink = vimEekContainer.querySelector('.fake-link');
            if (fakeLink) {
                const fakeLinkText = fakeLink.textContent || '';
                const isFakeEekButton = /EEK\s*[A-G][+]*/i.test(fakeLinkText);
                if (isFakeEekButton) {
                    console.log('Fake EEK link detected, excluding:', fakeLinkText.trim());
                    return false;
                }
            }

            // Check for energy rating content within .eek element
            const eekRating = eekElement.querySelector('.eek__rating');
            const hasRatingContent = eekRating && eekRating.textContent.trim().length > 0;

            if (hasRatingContent) {
                console.log('Interactive energy label found:', { 
                    rating: eekRating.textContent.trim(),
                    hasOverlayWrapper: true,
                    hasUxEekIcon: true,
                    hasEekElement: true
                });
                return true;
            }

            console.log('Energy structure found but no rating content');
            return false;

        } catch (error) {
            console.error('Error checking Energy Label:', error);
            return false;
        }
    }

    /**
     * Check for Mouse-over Energy Label structures
     * Real eBay structure: .infotip__overlay > .infotip__mask > .infotip__cell > .infotip__content > .ux-image > img[src*="ebayimg"]
     * Must be within regulatory wrapper context
     * @param {Document} dom - DOM document
     * @returns {boolean} True if mouseover structure is found
     */
    checkMouseOver(dom) {
        try {
            // Check for regulatory wrapper context first
            const regulatoryWrapper = dom.querySelector('.x-regulatory-wrapper');
            if (!regulatoryWrapper) {
                console.log('No .x-regulatory-wrapper found for mouseover check');
                return false;
            }

            // Look for infotip overlay containers anywhere in document (can be positioned outside wrapper)
            const infotipOverlays = dom.querySelectorAll('.infotip__overlay');
            
            if (infotipOverlays.length === 0) {
                console.log('No .infotip__overlay containers found');
                return false;
            }

            // Check each overlay for the expected nested structure
            for (const overlay of infotipOverlays) {
                const infotipMask = overlay.querySelector('.infotip__mask');
                if (!infotipMask) {
                    continue; // Try next overlay
                }

                const infotipCell = infotipMask.querySelector('.infotip__cell');
                if (!infotipCell) {
                    continue; // Try next overlay
                }

                const infotipContent = infotipCell.querySelector('.infotip__content');
                if (!infotipContent) {
                    continue; // Try next overlay
                }

                const uxImage = infotipContent.querySelector('.ux-image');
                if (!uxImage) {
                    continue; // Try next overlay
                }

                // Look for image within ux-image wrapper
                const img = uxImage.querySelector('img');
                if (!img) {
                    continue; // Try next overlay
                }

                // Check if image has eBay-based URL and energy-related alt text
                const src = img.getAttribute('src') || '';
                const alt = img.getAttribute('alt') || '';
                const isEbayImage = src.toLowerCase().includes('ebayimg');
                const isEnergyImage = alt.toLowerCase().includes('eek') || 
                                    alt.toLowerCase().includes('energy') ||
                                    /[A-G]/i.test(alt);

                if (isEbayImage && isEnergyImage) {
                    console.log('Valid mouseover energy structure found:', { 
                        src, 
                        alt: alt.trim(),
                        hasCompleteStructure: true 
                    });
                    return true;
                }
            }

            // Secondary check: any infotip with eBay image (less strict)
            const anyEbayImage = dom.querySelector('.infotip__overlay img[src*="ebayimg"]');
            if (anyEbayImage) {
                console.log('Basic mouseover structure found with eBay image');
                return true;
            }

            console.log('No valid mouse-over structures found');
            return false;

        } catch (error) {
            console.error('Error checking Mouse-over structures:', error);
            return false;
        }
    }

    /**
     * Comprehensive energy label analysis with detailed logging
     * @param {string} htmlString - Complete HTML content
     * @returns {Object} Detailed analysis results
     */
    performDetailedAnalysis(htmlString) {
        console.log('Starting detailed DOM analysis...');
        
        const dom = this.parseHTML(htmlString);
        const results = {
            produktdatenblatt: false,
            energielabel: false,
            mouseover: false,
            debug: {
                regulatoryWrapperFound: false,
                vimEekFound: false,
                infotipOverlayFound: false,
                elementCounts: {}
            }
        };

        // Count relevant elements for debugging
        results.debug.elementCounts = {
            regulatoryWrapper: dom.querySelectorAll('.x-regulatory-wrapper').length,
            xEek: dom.querySelectorAll('.x-eek').length,
            vimXEek: dom.querySelectorAll('.vim.x-eek').length,
            uxEekIcon: dom.querySelectorAll('.ux-eek-icon').length,
            eekRating: dom.querySelectorAll('.eek__rating').length,
            infotipOverlay: dom.querySelectorAll('.infotip__overlay').length,
            infotipMask: dom.querySelectorAll('.infotip__mask').length
        };

        // Set debug flags
        results.debug.regulatoryWrapperFound = results.debug.elementCounts.regulatoryWrapper > 0;
        results.debug.vimEekFound = results.debug.elementCounts.vimXEek > 0;
        results.debug.infotipOverlayFound = results.debug.elementCounts.infotipOverlay > 0;

        // Perform checks
        results.produktdatenblatt = this.checkProduktdatenblatt(dom);
        results.energielabel = this.checkEnergielabel(dom);
        results.mouseover = this.checkMouseOver(dom);

        results.timestamp = new Date().toISOString();

        console.log('DOM analysis complete:', results);
        return results;
    }

    /**
     * Validate DOM structure before analysis
     * @param {Document} dom - DOM document
     * @returns {Object} Validation results
     */
    validateDomStructure(dom) {
        const validation = {
            isValid: true,
            issues: [],
            elementCounts: {}
        };

        try {
            // Check if DOM was parsed correctly
            if (!dom || !dom.body) {
                validation.isValid = false;
                validation.issues.push('Invalid DOM structure - no body element');
                return validation;
            }

            // Count key elements
            const keySelectors = [
                '.x-regulatory-wrapper',
                '.x-eek',
                '.vim.x-eek',
                '.ux-eek-icon',
                '.infotip__overlay'
            ];

            keySelectors.forEach(selector => {
                const elements = dom.querySelectorAll(selector);
                validation.elementCounts[selector] = elements.length;
            });

            // Check for minimum expected structure
            if (validation.elementCounts['.x-regulatory-wrapper'] === 0) {
                validation.issues.push('No regulatory wrapper found - may not be an eBay product page');
            }

            return validation;

        } catch (error) {
            validation.isValid = false;
            validation.issues.push(`DOM validation error: ${error.message}`);
            return validation;
        }
    }
}

/**
 * Create singleton instance for export
 */
export const domAnalyzer = new DomAnalyzer();

/**
 * Convenience function for quick analysis
 * @param {string} htmlString - HTML content to analyze
 * @returns {Object} Analysis results
 */
export function analyzeEnergyLabels(htmlString) {
    return domAnalyzer.analyzeEnergyLabels(htmlString);
}

/**
 * Convenience function for detailed analysis with debugging
 * @param {string} htmlString - HTML content to analyze
 * @returns {Object} Detailed analysis results with debug information
 */
export function performDetailedAnalysis(htmlString) {
    return domAnalyzer.performDetailedAnalysis(htmlString);
}