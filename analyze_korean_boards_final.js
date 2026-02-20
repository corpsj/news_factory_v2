const { chromium } = require('playwright');

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

async function analyzeSiteFinal(browser, site) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`FINAL ANALYSIS: ${site.name}`);
  console.log(`URL: ${site.url}`);
  console.log('='.repeat(100));

  const page = await browser.newPage();
  
  try {
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for dynamic content to load
    await page.waitForTimeout(3000);
    
    // Try to wait for specific board elements
    try {
      await page.waitForSelector('table tbody tr, .board_list li, ul.board_list li, div[class*="board"] li', { timeout: 5000 });
    } catch (e) {
      console.log('  ⚠ No standard board selectors found, checking for dynamic content...');
    }
    
    const currentUrl = page.url();
    console.log(`\n✓ Page loaded`);
    console.log(`  Final URL: ${currentUrl}`);
    
    // Comprehensive board analysis
    const analysis = await page.evaluate(() => {
      const result = {
        pageRendered: true,
        boardSelector: null,
        totalRows: 0,
        articles: [],
        urlPattern: null,
        datePattern: null
      };
      
      // Try all possible selectors
      const selectorCandidates = [
        'table tbody tr',
        '.board_list li',
        'ul.board_list li',
        'div[class*="board"] li',
        'li[class*="item"]',
        'tr[class*="list"]',
        'div.list-item',
        'article',
        'div[class*="article"]'
      ];
      
      let foundRows = null;
      for (const selector of selectorCandidates) {
        const rows = document.querySelectorAll(selector);
        if (rows.length > 0) {
          result.boardSelector = selector;
          result.totalRows = rows.length;
          foundRows = rows;
          break;
        }
      }
      
      if (foundRows) {
        // Extract article data from each row
        for (let i = 0; i < Math.min(5, foundRows.length); i++) {
          const row = foundRows[i];
          const article = {
            index: i,
            title: null,
            href: null,
            date: null,
            rawText: row.innerText.substring(0, 300)
          };
          
          // Find title link
          const titleLink = row.querySelector('a');
          if (titleLink) {
            article.title = titleLink.innerText.trim().substring(0, 150);
            article.href = titleLink.getAttribute('href');
          }
          
          // Find date
          const dateMatch = row.innerText.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/);
          if (dateMatch) {
            article.date = dateMatch[0];
          }
          
          result.articles.push(article);
        }
        
        // Detect URL pattern
        if (result.articles.length > 0 && result.articles[0].href) {
          const href = result.articles[0].href;
          if (href.includes('?')) {
            const params = new URLSearchParams(href.split('?')[1]);
            result.urlPattern = Array.from(params.keys()).join(', ');
          }
        }
      }
      
      return result;
    });
    
    console.log(`\n📊 BOARD ANALYSIS:`);
    console.log(`  Board Selector: ${analysis.boardSelector}`);
    console.log(`  Total Rows: ${analysis.totalRows}`);
    console.log(`  URL Parameters: ${analysis.urlPattern || 'N/A'}`);
    
    console.log(`\n📰 ARTICLES FOUND:`);
    analysis.articles.forEach((article, idx) => {
      console.log(`\n  ARTICLE ${idx + 1}:`);
      console.log(`    Title: ${article.title || 'N/A'}`);
      console.log(`    Href: ${article.href || 'N/A'}`);
      console.log(`    Date: ${article.date || 'N/A'}`);
    });
    
    // Get detail page URL
    if (analysis.articles.length > 0 && analysis.articles[0].href) {
      const firstHref = analysis.articles[0].href;
      let detailUrl;
      
      try {
        if (firstHref.startsWith('http')) {
          detailUrl = firstHref;
        } else if (firstHref.startsWith('/')) {
          detailUrl = new URL(firstHref, site.url).href;
        } else {
          detailUrl = new URL(firstHref, site.url).href;
        }
        
        console.log(`\n🔗 DETAIL PAGE:`);
        console.log(`  Sample Detail URL: ${detailUrl}`);
        
        // Try to navigate to detail page
        try {
          await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 15000 });
          const finalDetailUrl = page.url();
          console.log(`  Actual Detail URL: ${finalDetailUrl}`);
        } catch (e) {
          console.log(`  ⚠ Could not navigate to detail page`);
        }
      } catch (e) {
        console.log(`  ⚠ Could not construct detail URL`);
      }
    }
    
    // Check for JavaScript-rendered content
    const jsContent = await page.evaluate(() => {
      return {
        hasReact: !!window.React,
        hasVue: !!window.Vue,
        hasAngular: !!window.angular,
        hasJQuery: !!window.jQuery,
        bodyHeight: document.body.scrollHeight,
        contentLoaded: document.body.innerText.length > 100
      };
    });
    
    console.log(`\n⚙️ RENDERING INFO:`);
    console.log(`  Content Loaded: ${jsContent.contentLoaded}`);
    console.log(`  Body Height: ${jsContent.bodyHeight}px`);
    console.log(`  React: ${jsContent.hasReact}`);
    console.log(`  Vue: ${jsContent.hasVue}`);
    console.log(`  Angular: ${jsContent.hasAngular}`);
    console.log(`  jQuery: ${jsContent.hasJQuery}`);
    
    console.log(`\n✓ Analysis complete for ${site.name}`);
    
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  try {
    for (const site of sites) {
      await analyzeSiteFinal(browser, site);
    }
  } finally {
    await browser.close();
  }
  
  console.log(`\n${'='.repeat(100)}`);
  console.log('FINAL ANALYSIS COMPLETE');
  console.log('='.repeat(100));
}

main().catch(console.error);
