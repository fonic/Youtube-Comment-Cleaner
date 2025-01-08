// ==UserScript==
// @name        Youtube Comment Cleaner (YCC)
// @description Allows batch-deletion of Youtube-related activity items (comments, live chat messages, likes/dislikes, etc.)
// @author      Fonic <https://github.com/fonic> (this userscript)
// @author      Christian Prior-Mamulyan <https://github.com/cprima> (orginal script)
// @homepage    https://github.com/fonic/Youtube-Comment-Cleaner
// @supportURL  https://github.com/fonic/Youtube-Comment-Cleaner
// @downloadURL https://github.com/fonic/Youtube-Comment-Cleaner/raw/main/Youtube%20Comment%20Cleaner%20%28YCC%29.user.js
// @updateURL   https://github.com/fonic/Youtube-Comment-Cleaner/raw/main/Youtube%20Comment%20Cleaner%20%28YCC%29.user.js
// @namespace   myactivity.google.com
// @match       https://myactivity.google.com/*
// @version     1.2
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

function ensureOnCorrectActivityPage() {
    // List of supported pages (NOTE: make sure to add suitable '@match'
    // items for each of these to the script's '==UserScript==' section)
    const supportedPages = [
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_subscriptions
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_subscriptions',
            title: 'Your YouTube channel subscriptions'
        },
        {
            // URL (normal account): https://myactivity.google.com/page?hl=en&page=youtube_comments
            // URL (brand account):  https://myactivity.google.com/u/1/page?hl=en&page=youtube_comments
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_comments',
            title: 'Your YouTube Comments'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_comment_likes
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_comment_likes',
            title: 'Your Likes and Dislikes on YouTube Comments'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_posts_activity
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_posts_activity',
            title: 'Your activity on YouTube posts'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_live_chat
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_live_chat',
            title: 'Your YouTube Live Chat Messages'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_likes
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_likes',
            title: 'Your likes and dislikes on YouTube videos'
        },
        {
            // URL: https://myactivity.google.com/page?hl=en&page=youtube_commerce_acquisitions
            urlsw: 'https://myactivity.google.com/',
            param: 'page',
            value: 'youtube_commerce_acquisitions',
            title: 'YouTube Purchases'
        }
    ];

    // Fetch current URL, decode URL parameters
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);

    // Iterate list of supported pages and check if current page matches
    for (const pageData of supportedPages) {
        if (!currentUrl.startsWith(pageData.urlsw)) {
            continue;
        }
        if (!urlParams.has(pageData.param)) {
            continue;
        }
        if (urlParams.get(pageData.param) != pageData.value) {
            continue;
        }
        console.log(`[YCC] Supported page detected: URL starts with '${pageData.urlsw}', URL contains parameter '${pageData.param}' with value '${pageData.value}'`);
        return true; // Current page is supported
    }

    // Current page is NOT supported
    console.log('[YCC] Current page does not match any known supported page.');
    alert('You are currently not on a supported activity page. Please navigate to one of the following supported activity pages:\n\n' + supportedPages.map(page => page.title).join('\n'));
    return false;
}

async function scrollToBottom() {
    while (!document.evaluate('//div[contains(text(), "Looks like you\'ve reached the end")] | //p[contains(text(), "No activity.")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

function highlightElement(el) {
    el.style.backgroundColor = '#ffcccb'; // Light red
    setTimeout(() => {
        el.style.backgroundColor = ''; // Reset background color after 1s
    }, 1000);
}

function determineBestSelector() {
    const SELECTORS = [
        '.VfPpkd-Bz112c-LgbsSe.yHy1rc.eT1oJ.mN1ivc',
        '[aria-label^="Delete activity item"]',
        '[jscontroller="soHxf"]'
    ];

    // Get the selector that matches the least amount of elements (more specific)
    SELECTORS.sort((a, b) => document.querySelectorAll(a).length - document.querySelectorAll(b).length);
    return SELECTORS[0];
}

async function deleteItems(deleteBatchSize) {
    let deleteButtons = [];

    const bestSelector = determineBestSelector();
    if (!deleteButtons.length) {
        deleteButtons = [...document.querySelectorAll(bestSelector)]; //.reverse();
    }

    let count = 0;

    while (deleteButtons.length && (count < deleteBatchSize || deleteBatchSize === Infinity)) {
        const btn = deleteButtons.pop();

        // Scroll to the button to make it visible before deletion
        btn.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        await new Promise(resolve => setTimeout(resolve, 1000)); // Give a moment for the scroll to finish

        highlightElement(btn);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2s for the highlight to be visible
        btn.click();
        count++;
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return deleteButtons.length; // Return the number of remaining items
}

async function initiateItemDeletion() {
    if (!ensureOnCorrectActivityPage()) {
        return;
    }

    await scrollToBottom();

    const bestSelector = determineBestSelector();
    const totalItems = document.querySelectorAll(bestSelector).length;

    if (!totalItems) {
        console.log('[YCC] No items found for deletion.');
        alert('No items found for deletion.');
        return;
    }

    let userInput = prompt(`Found ${totalItems} items. Enter 'a' to delete all items or input a number to delete that many items. Press 'Cancel' at any time to stop the script:`);

    while (userInput !== null) {
        if (userInput.toLowerCase() === 'a') {
            await deleteItems(Infinity);
            console.log('[YCC] All items deleted.');
            return;
        } else if (!isNaN(parseInt(userInput))) {
            const deleteBatchSize = parseInt(userInput);
            const remainingItems = await deleteItems(deleteBatchSize);

            if (!remainingItems) {
                console.log('[YCC] All items deleted.');
                return;
            }

            userInput = prompt(`${remainingItems} items remaining. Enter 'a' to delete all remaining items or input a number to delete that many items. Press 'Cancel' at any time to stop the script:`);
        } else {
            userInput = prompt('Invalid input. Please enter \'a\' or a number:');
        }
    }

    console.log('[YCC] Operation canceled. No further items will be deleted.');
}

initiateItemDeletion();
