/**
 * MITHRA Energy Label Analyzer - Energy Parser
 * HTML analysis module for detecting energy labels using JSDOM
 */

import { JSDOM } from 'jsdom';
import { ENERGY_SELECTORS, ENERGY_LABELS } from '../shared/constants.js';

export class EnergyParser {
    constructor() {
        this.debug = process.env.NODE_ENV !== 'production';
    }

    /**
     * Analyze HTML content for energy labels
     */
    analyzeHTML(html, url = null) {
        try {
            if (!html || html.trim().length === 0) {
                throw new Error('Empty HTML content provided');
            }

            // Create DOM from HTML
            const dom = new JSDOM(html, {
                url: url || 'https://www.ebay.com',
                pretendToBeVisual: false,
                resources: 'usable'
            });
            
            const document = dom.window.document;
            
            if (this.debug) {
                console.log(`Analyzing HTML content (${html.length} chars) for URL: ${url}`);
            }

            return {
                productFiche: this.checkProductFiche(document),
                energyLabel: this.checkEnergyLabel(document), 
                mouseoverLabel: this.checkMouseoverLabel(document),
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('HTML parsing error:', error.message);
            return {
                productFiche: 'ERROR',
                energyLabel: 'ERROR', 
                mouseoverLabel: 'ERROR',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Check for Product Fiche (Produktdatenblatt) links
     */
    checkProductFiche(document) {
        const qs = (doc, sel) => doc.querySelector(sel);
        const link = qs(document, ENERGY_SELECTORS.PRODUCT_FICHE);
        return (link && /Produktdatenblatt/i.test(link.textContent)) ? 'Y' : 'N';
    }

    /**
     * Check for Energy Label presence
     */
    checkEnergyLabel(document) {
        const qs = (doc, sel) => doc.querySelector(sel);
        const wrapper = qs(document, ENERGY_SELECTORS.REGULATORY_WRAPPER);
        if (!wrapper) return 'N';

        const icon = qs(wrapper, ENERGY_SELECTORS.ENERGY_ICON);
        const text = wrapper.textContent.match(/EEK\s*[A-G][+]{0,3}|Energy\s*Rating/i);
        return (icon || text) ? 'Y' : 'N';
    }

    /**
     * Check for Mouseover/Tooltip Energy Label
     */
    checkMouseoverLabel(document) {
        const qs = (doc, sel) => doc.querySelector(sel);
        const mask = qs(document, ENERGY_SELECTORS.MOUSEOVER_MASK);
        const img = qs(document, ENERGY_SELECTORS.MOUSEOVER_IMAGE);
        return (mask && img) ? 'Y' : 'N';
    }

    /**
     * Find energy rating patterns in text
     */
    findEnergyRatingInText(text) {
        if (!text) return null;
        
        // Look for energy ratings (A+++, A++, A+, A, B, C, D, E, F, G)
        const energyPattern = /\b(A\+{0,3}|[B-G])\b/gi;
        const matches = text.match(energyPattern);
        
        if (matches) {
            // Filter out common false positives
            const validMatches = matches.filter(match => {
                const upperMatch = match.toUpperCase();
                return ENERGY_LABELS.includes(upperMatch);
            });
            
            return validMatches.length > 0 ? validMatches[0] : null;
        }
        
        return null;
    }

    /**
     * Get detailed analysis information
     */
    getDetailedAnalysis(html, url = null) {
        try {
            const dom = new JSDOM(html, { url: url || 'https://www.ebay.com' });
            const document = dom.window.document;

            const analysis = {
                url,
                hasRegulatoryWrapper: !!document.querySelector(ENERGY_SELECTORS.REGULATORY_WRAPPER),
                hasEnergySection: !!document.querySelector(ENERGY_SELECTORS.ENERGY_SECTION),
                productFicheLinks: [],
                energyElements: [],
                mouseoverElements: [],
                energyRatingsFound: [],
                timestamp: new Date().toISOString()
            };

            // Collect product fiche links
            const ficheLinks = document.querySelectorAll(ENERGY_SELECTORS.PRODUCT_FICHE);
            for (const link of ficheLinks) {
                analysis.productFicheLinks.push({
                    href: link.getAttribute('href'),
                    text: link.textContent?.trim()
                });
            }

            // Collect energy elements
            const energySelectors = [
                ENERGY_SELECTORS.ENERGY_ICON,
                ENERGY_SELECTORS.ENERGY_RATING,
                ENERGY_SELECTORS.ENERGY_RATING_ALT
            ];

            for (const selector of energySelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    analysis.energyElements.push({
                        selector,
                        className: element.className,
                        text: element.textContent?.trim()
                    });
                }
            }

            // Find energy ratings in text
            const bodyText = document.body.textContent || '';
            const ratings = this.findEnergyRatingInText(bodyText);
            if (ratings) {
                analysis.energyRatingsFound.push(ratings);
            }

            return analysis;
            
        } catch (error) {
            console.error('Error in detailed analysis:', error);
            return { error: error.message };
        }
    }
}