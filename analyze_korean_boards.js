const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sites = [
  {
    name: '목포시',
    url: 'https://www.mokpo.go.kr/www/mokpo_news/press_release'
  },
  {
    name: '담양군',
    url: 'https://www.damyang.go.kr/board/list?boardId=BBS_0000007&domainId=DOM_0000001&menuCd=DOM_000000190001005001&contentsSid=12'
  },
  {
    name: '구례군',
    url: 'https://www.gurye.go.kr/board/list.do?bbsId=BBS_0000000000000300&menuNo=115004006000'
  },
  {
    name: '고흥군',
    url: 'https://www.goheung.go.kr/boardList.do?boardId=BD_00025&pageId=www102'
  },
  {
    name: '보성군',
    url: 'https://www.boseong.go.kr/www/open_administration/city_news/press_release'
  }
];

async function analyzeSite(browser, site) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ANALYZING: ${site.name}`);
  console.log(`URL: ${site.url}`);
  console.log('='.repeat(80));

  const page = await browser.newPage();
  
  try {
    // Navigate and wait for network idle
    console.log('Navigating to page...');
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait a bit more for any dynamic content
    await page.waitForTimeout(2000);
    
    // Take screenshot
    const screenshotPath = `/tmp/screenshot_${site.name.replace(/\s+/g, '_')}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Screenshot saved: ${screenshotPath}`);
    
    // Check page title and URL
    const title = await page.title();
    const currentUrl = page.url();
    console.log(`\nPage Title: ${title}`);
    console.log(`Current URL: ${currentUrl}`);
    
    // Check if page redirected
    if (currentUrl !== site.url) {
      console.log(`⚠ PAGE REDIRECTED from original URL`);
    }
    
    // Analyze DOM structure
    const analysis = await page.evaluate(() => {
      const result = {
        pageHeight: document.documentElement.scrollHeight,
        bodyText: document.body.innerText.substring(0, 200),
        tables: document.querySelectorAll('table').length,
        tableRows: document.querySelectorAll('table tbody tr').length,
        boardListItems: document.querySelectorAll('.board_list li').length,
        ulLiLinks: document.querySelectorAll('ul li a').length,
        allLinks: document.querySelectorAll('a').length,
        divContainers: document.querySelectorAll('div[class*="list"]').length,
        articleLinks: [],
        selectors: {}
      };
      
      // Try different selectors for article lists
      const selectors = [
        'table tbody tr',
        '.board_list li',
        'ul li a',
        'div.list-item',
        'div[class*="article"]',
        'li[class*="item"]',
        'tr[class*="list"]',
        'a[class*="title"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          result.selectors[selector] = elements.length;
        }
      }
      
      // Find all links that might be article links
      const allLinks = document.querySelectorAll('a');
      allLinks.forEach((link, idx) => {
        if (idx < 20) { // Get first 20 links
          const href = link.getAttribute('href');
          const text = link.innerText.trim().substring(0, 50);
          if (href && text && !href.includes('javascript')) {
            result.articleLinks.push({
              href: href,
              text: text,
              class: link.className
            });
          }
        }
      });
      
      return result;
    });
    
    console.log(`\n📊 DOM ANALYSIS:`);
    console.log(`  Page Height: ${analysis.pageHeight}px`);
    console.log(`  Table rows found: ${analysis.tableRows}`);
    console.log(`  Board list items (.board_list li): ${analysis.boardListItems}`);
    console.log(`  UL > LI > A elements: ${analysis.ulLiLinks}`);
    console.log(`  Total links on page: ${analysis.allLinks}`);
    
    console.log(`\n🔍 SELECTOR MATCHES:`);
    Object.entries(analysis.selectors).forEach(([selector, count]) => {
      console.log(`  ${selector}: ${count} matches`);
    });
    
    console.log(`\n🔗 SAMPLE ARTICLE LINKS (first 10):`);
    analysis.articleLinks.slice(0, 10).forEach((link, idx) => {
      console.log(`  ${idx + 1}. href: ${link.href}`);
      console.log(`     text: ${link.text}`);
      console.log(`     class: ${link.class}`);
    });
    
    // Try to find the best selector for board rows
    const bestSelector = await page.evaluate(() => {
      const candidates = [
        { sel: 'table tbody tr', type: 'table' },
        { sel: '.board_list li', type: 'list' },
        { sel: 'ul.board_list li', type: 'ul-list' },
        { sel: 'div[class*="list"] > div[class*="item"]', type: 'div-list' },
        { sel: 'tr[class*="list"]', type: 'tr-list' }
      ];
      
      for (const candidate of candidates) {
        const elements = document.querySelectorAll(candidate.sel);
        if (elements.length > 0) {
          // Get first element's HTML structure
          const firstElement = elements[0];
          return {
            selector: candidate.sel,
            type: candidate.type,
            count: elements.length,
            firstElementHTML: firstElement.outerHTML.substring(0, 500),
            firstElementClasses: firstElement.className
          };
        }
      }
      return null;
    });
    
    if (bestSelector) {
      console.log(`\n✅ BEST SELECTOR FOR BOARD ROWS:`);
      console.log(`  Selector: ${bestSelector.selector}`);
      console.log(`  Type: ${bestSelector.type}`);
      console.log(`  Count: ${bestSelector.count}`);
      console.log(`  Classes: ${bestSelector.firstElementClasses}`);
      console.log(`  HTML Sample:\n${bestSelector.firstElementHTML}`);
    }
    
    // Extract title and date selectors from first row
    const rowDetails = await page.evaluate(() => {
      const candidates = [
        'table tbody tr',
        '.board_list li',
        'ul.board_list li',
        'div[class*="list"] > div[class*="item"]'
      ];
      
      for (const selector of candidates) {
        const rows = document.querySelectorAll(selector);
        if (rows.length > 0) {
          const firstRow = rows[0];
          const titleLink = firstRow.querySelector('a');
          const dateElements = firstRow.querySelectorAll('span, td, div');
          
          return {
            rowSelector: selector,
            titleLink: titleLink ? {
              href: titleLink.getAttribute('href'),
              text: titleLink.innerText.trim().substring(0, 100),
              class: titleLink.className
            } : null,
            dateText: Array.from(dateElements)
              .map(el => el.innerText.trim())
              .filter(text => /\d{4}[-\/]\d{2}[-\/]\d{2}/.test(text))
              .slice(0, 3)
          };
        }
      }
      return null;
    });
    
    if (rowDetails) {
      console.log(`\n📝 ROW DETAILS:`);
      console.log(`  Row Selector: ${rowDetails.rowSelector}`);
      if (rowDetails.titleLink) {
        console.log(`  Title Link href: ${rowDetails.titleLink.href}`);
        console.log(`  Title Link text: ${rowDetails.titleLink.text}`);
        console.log(`  Title Link class: ${rowDetails.titleLink.class}`);
      }
      if (rowDetails.dateText.length > 0) {
        console.log(`  Date patterns found: ${rowDetails.dateText.join(', ')}`);
      }
    }
    
    console.log(`\n✓ Analysis complete for ${site.name}`);
    
  } catch (error) {
    console.error(`✗ Error analyzing ${site.name}:`, error.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  try {
    for (const site of sites) {
      await analyzeSite(browser, site);
    }
  } finally {
    await browser.close();
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
