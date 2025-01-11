// ==UserScript==
// @name        YouTube Activity Cleaner (YAC)
// @description Allows batch-deletion of past YouTube activity (comments, live chat messages, likes/dislikes, etc.)
// @author      Fonic <https://github.com/fonic> (this fork)
// @author      Christian Prior-Mamulyan <https://github.com/cprima> (orginal script)
// @homepage    https://github.com/fonic/YouTube-Activity-Cleaner
// @supportURL  https://github.com/fonic/YouTube-Activity-Cleaner
// @downloadURL https://github.com/fonic/YouTube-Activity-Cleaner/raw/main/YouTube%20Activity%20Cleaner%20%28YAC%29.user.js
// @updateURL   https://github.com/fonic/YouTube-Activity-Cleaner/raw/main/YouTube%20Activity%20Cleaner%20%28YAC%29.user.js
// @namespace   myactivity.google.com
// @match       https://myactivity.google.com/*
// @version     1.4
// @grant       none
// @run-at      context-menu
// ==/UserScript==

/**
 * Based on: https://gist.github.com/cprima/2f7ea8e353c18a666506021c85e9773d
 * Original author's notes:
 *
 * Google MyActivity YouTube Comment Deletion Script
 *
 * Script to assist in bulk deletion of YouTube comments from Google's MyActivity.
 *
 * Usage:
 * - Navigate to MyActivity YouTube Comments page.
 * - Open browser's developer console.
 * - Copy-paste this script, and follow on-screen prompts.
 *
 * Features:
 * - Deletes comments from bottom (oldest first).
 * - User control: specify number to delete, or cancel anytime.
 *
 * Safety:
 * - Halting: 'cancel' during prompt or close tab.
 *
 * Author: Christian Prior-Mamulyan
 * License: MIT
 * Source: https://gist.github.com/cprima/2f7ea8e353c18a666506021c85e9773d
 *
 * Use cautiously. Deletion is irreversible.
 */

function checkIfPageIsSupported() {
    // List of supported pages (NOTE: make sure to add suitable '@match'
    // lines for each of these to the script's '==UserScript==' section;
    // ordered from most interesting/useful to least interesting/useful)
    const supportedPages = [
        {
            // URL (normal account): https://myactivity.google.com/page?hl=en&page=youtube_comments
            // URL (brand account):  https://myactivity.google.com/u/1/page?hl=en&page=youtube_comments
            title: 'Your YouTube Comments',
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_comments'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_live_chat
            title: 'Your YouTube Live Chat Messages',
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_live_chat'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_comment_likes
            title: 'Your Likes and Dislikes on YouTube Comments',
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_comment_likes'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_likes
            title: 'Your Likes and Dislikes on YouTube Videos',
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_likes'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_posts_activity
            title: 'Your Activity on YouTube Posts',
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_posts_activity'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_commerce_acquisitions
            title: 'YouTube Purchases',
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_commerce_acquisitions'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_subscriptions
            title: 'Your YouTube Channel Subscriptions',
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_subscriptions'
        }
    ];

    // Fetch current URL, decode URL parameters
    const currentURL = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);

    // Iterate list of supported pages and check if current page matches
    for (const pageData of supportedPages) {
        if (!currentURL.startsWith(pageData.urlsw)) {
            continue;
        }
        if (!urlParams.has(pageData.param)) {
            continue;
        }
        if (urlParams.get(pageData.param) != pageData.value) {
            continue;
        }
        // Current page IS supported
        console.log(`[YAC] Supported page detected: URL starts with '${pageData.urlsw}', URL contains parameter '${pageData.param}' with value '${pageData.value}' -> page is '${pageData.title}'`);
        return true;
    }

    // Current page is NOT supported
    console.log(`[YAC] Current page does not match any known supported page: ${currentURL}`);
    alert('You are currently not on a supported activity page.\nPlease navigate to one of the following activity pages:\n\n' + supportedPages.map(page => page.title).join('\n'));
    return false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function determineBestSelector() {
    const SELECTORS = [
        '.VfPpkd-Bz112c-LgbsSe.yHy1rc.eT1oJ.mN1ivc',
        '[aria-label^="Delete activity item"]',
        '[jscontroller="soHxf"]'
    ];

    // Return the selector that matches the least amount of elements (i.e.
    // which is the most specific)
    SELECTORS.sort((a, b) => document.querySelectorAll(a).length - document.querySelectorAll(b).length);
    return SELECTORS[0];
}

async function deleteItems(deleteBatchSize) {
    // Compile list of available delete buttons (reversed order for delete
    // BatchSize < 0; NOTE: '[...doc]' -> destructuring/unpack assignment)
    const bestSelector = determineBestSelector();
    let deleteButtons = deleteBatchSize >= 0 ? [...document.querySelectorAll(bestSelector)] : [...document.querySelectorAll(bestSelector)].reverse();
    deleteBatchSize = Math.abs(deleteBatchSize);

    // Delete items
    console.log('[YAC] Deleting ' + (deleteBatchSize === Infinity ? "ALL" : deleteBatchSize) + ' item(s)...');
    let count = 0;
    while ((deleteButtons.length > 0) && (count < deleteBatchSize || deleteBatchSize === Infinity)) {
        // Fetch and remove next delete button from end of list
        const button = deleteButtons.pop();

        // Scroll button into view, pause to allow scroll to finish
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(1000);

        // Highlight delete button (light red), pause to allow highlight
        // to be visible, clear highlight, pause again
        button.style.backgroundColor = '#ffcccc';
        await sleep(1000);
        button.style.backgroundColor = '';
        await sleep(1000);

        // Click delete button, pause to allow deletion to finish (NOTE:
        // disable the following line for testing!)
        button.click();
        count++;
        await sleep(1500);
    }

    // Return number of remaining items
    return deleteButtons.length;
}

async function initiateItemDeletion() {
    // Check if current page is a supported activity page
    console.log('[YAC] Checking if current page is a supported activity page...');
    if (!checkIfPageIsSupported()) {
        return;
    }

    // Scroll to bottom of page (repeatedly if necessary, until ALL items are
    // loaded and listed)
    console.log('[YAC] Scrolling to bottom of page to load/list all items...');
    while (!document.evaluate('//div[contains(text(), "Looks like you\'ve reached the end")] | //p[contains(text(), "No activity.")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(1000);
    }

    // Determine number of items available for deletion, abort if none found
    console.log('[YAC] Determining number of items available for deletion...');
    const bestSelector = determineBestSelector();
    const totalItems = document.querySelectorAll(bestSelector).length;
    if (totalItems <= 0) {
        console.log('[YAC] No items found for deletion.');
        alert('No items found for deletion.');
        return;
    }

    // Prompt user to specify amount of items to delete (NOTE: prompt returns
    // null when user hits 'Cancel')
    console.log('[YAC] Prompting user to specify amount of items to delete...');
    let userInput = prompt(`Found ${totalItems} items. Enter 'a' to delete ALL items or specify the number of items to delete (from oldest to newest; prefix with '-' to reverse order of deletion):`);

    // Evaluate user input and perform item deletion accordingly
    while (userInput !== null) {
        if (userInput.toLowerCase() === 'a') {            // Delete ALL items (from oldest to newest)
            await deleteItems(Infinity);
            console.log('[YAC] All items deleted.');
            return;
        } else if (userInput.toLowerCase() === '-a') {    // Delete ALL items (from newest to oldest)
            await deleteItems(-Infinity);
            console.log('[YAC] All items deleted.');
            return;
        } else if (/^-?[0-9]+$/.test(userInput)) {        // Delete n items (order depends on sign)
            const deleteBatchSize = parseInt(userInput, 10);
            const remainingItems = await deleteItems(deleteBatchSize);
            if (remainingItems <= 0) {
                console.log('[YAC] All items deleted.');
                return;
            }
            userInput = prompt(`${remainingItems} items remaining. Enter 'a' to delete ALL remaining items or specify the number of remaining items to delete (from oldest to newest; prefix with '-' to reverse order of deletion):`);
        } else {
            userInput = prompt('Invalid input. Please enter \'a\' or a number (hit \'Cancel\' to abort):');
        }
    }

    // Only reached if user hit 'Cancel' when being prompted above
    console.log('[YAC] Deletion aborted by user request.');
}

// Main entry point
initiateItemDeletion();
