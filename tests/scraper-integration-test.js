/**
 * Test the updated ScraperService with DOM analysis on Ground Truth URLs
 */

import { ScraperService } from '../backend/scraperService.js';

// Test URLs with expected results
const testSuites = [
    {
        name: 'YYY Links (All energy features expected)',
        expected: { productFiche: 'Y', energyLabel: 'Y', mouseoverLabel: 'Y' },
        urls: [
            'https://www.ebay.de/itm/126963032820',
            'https://www.ebay.de/itm/127352970063'
        ]
    },
    {
        name: 'NNN Links (No energy features expected)', 
        expected: { productFiche: 'N', energyLabel: 'N', mouseoverLabel: 'N' },
        urls: [
            'https://www.ebay.de/itm/126599347326',
            'https://www.ebay.de/itm/126502403225'
        ]
    },
    {
        name: 'YNN Links (Only product fiche expected)',
        expected: { productFiche: 'Y', energyLabel: 'N', mouseoverLabel: 'N' },
        urls: [
            'https://www.ebay.de/itm/126546282441',
            'https://www.ebay.de/itm/126546282523'
        ]
    }
];

async function testSingleUrl(scraper, url, expected) {
    console.log(`\n🔍 Testing: ${url}`);
    console.log(`Expected: Product=${expected.productFiche} Energy=${expected.energyLabel} Mouseover=${expected.mouseoverLabel}`);
    
    try {
        const scrapingResult = await scraper.scrapeEbayURL(url);
        
        console.log('Results: ', 
            `Product=${scrapingResult.productFiche} `,
            `Energy=${scrapingResult.energyLabel} `,
            `Mouseover=${scrapingResult.mouseoverLabel}`
        );
        
        // Check if results match expectations
        const matches = {
            productFiche: scrapingResult.productFiche === expected.productFiche,
            energyLabel: scrapingResult.energyLabel === expected.energyLabel,
            mouseoverLabel: scrapingResult.mouseoverLabel === expected.mouseoverLabel
        };
        
        const allMatch = matches.productFiche && matches.energyLabel && matches.mouseoverLabel;
        console.log(allMatch ? '✅ PASSED' : '❌ FAILED');
        
        if (!allMatch) {
            console.log('  Mismatches:');
            if (!matches.productFiche) console.log(`    Product Fiche: expected ${expected.productFiche}, got ${scrapingResult.productFiche}`);
            if (!matches.energyLabel) console.log(`    Energy Label: expected ${expected.energyLabel}, got ${scrapingResult.energyLabel}`);  
            if (!matches.mouseoverLabel) console.log(`    Mouseover: expected ${expected.mouseoverLabel}, got ${scrapingResult.mouseoverLabel}`);
        }
        
        // Show debug info if available
        if (scrapingResult.debug && scrapingResult.debug.elementCounts) {
            console.log('  Element Counts:', scrapingResult.debug.elementCounts);
        }
        
        return { url, expected, actual: scrapingResult, passed: allMatch };
        
    } catch (error) {
        console.log('❌ ERROR:', error.message);
        return { url, expected, actual: { error: error.message }, passed: false };
    }
}

async function testScraperService() {
    console.log('=== Testing ScraperService with Ground Truth URLs ===\n');

    const scraper = new ScraperService();
    const results = [];
    
    try {
        console.log('Initializing browser...');
        await scraper.initBrowser();
        
        // Test each suite
        for (const suite of testSuites) {
            console.log(`\n📂 ${suite.name}`);
            console.log('='.repeat(60));
            
            for (const url of suite.urls) {
                const result = await testSingleUrl(scraper, url, suite.expected);
                results.push(result);
                
                // Small delay between requests to be respectful
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        
        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
        
        // Show failed tests
        const failed = results.filter(r => !r.passed);
        if (failed.length > 0) {
            console.log('\n❌ Failed Tests:');
            failed.forEach(f => {
                console.log(`  ${f.url}`);
                if (f.actual.error) {
                    console.log(`    Error: ${f.actual.error}`);
                } else {
                    console.log(`    Expected: ${f.expected.productFiche}${f.expected.energyLabel}${f.expected.mouseoverLabel}`);
                    console.log(`    Actual:   ${f.actual.productFiche}${f.actual.energyLabel}${f.actual.mouseoverLabel}`);
                }
            });
        }
        
        console.log('\n✅ ScraperService Ground Truth test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await scraper.cleanup();
        console.log('Cleanup completed');
    }
}

testScraperService();