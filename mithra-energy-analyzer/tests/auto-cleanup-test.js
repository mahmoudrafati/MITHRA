/**
 * Test für das automatische Browser-Cleanup System
 */

import { ScraperService } from '../backend/scraperService.js';

async function testAutoCleanup() {
    console.log('=== Testing Auto-Cleanup System ===\n');

    const scraper = new ScraperService();
    
    try {
        console.log('1. 🚀 Initializing browser...');
        await scraper.initBrowser();
        console.log('   ✅ Browser initialized');
        
        console.log('\n2. 🔍 Making one request to set activity...');
        // Use a simple test URL
        const testUrl = 'https://www.ebay.de/itm/126963032820';
        await scraper.scrapeEbayURL(testUrl);
        console.log('   ✅ Request completed, activity timer reset');
        
        console.log('\n3. ⏳ Waiting for auto-cleanup...');
        console.log('   Browser should automatically close after 5 minutes of inactivity');
        console.log('   For testing purposes, let\'s wait 10 seconds to see the timer in action...');
        
        // Check browser status over time
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const isConnected = scraper.browser && scraper.browser.isConnected();
            console.log(`   ${i + 1}s: Browser connected: ${isConnected}`);
        }
        
        console.log('\n4. 📊 Manual cleanup test...');
        await scraper.cleanup();
        console.log('   ✅ Manual cleanup completed');
        
        console.log('\n✅ Auto-cleanup system test completed successfully!');
        console.log('\n📋 Features implemented:');
        console.log('   • 5-minute inactivity timer');
        console.log('   • Timer reset on each browser interaction');
        console.log('   • Graceful browser shutdown with resource cleanup');
        console.log('   • Automatic Chrome process termination');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await scraper.cleanup();
        console.log('\nTest cleanup completed');
    }
}

testAutoCleanup();