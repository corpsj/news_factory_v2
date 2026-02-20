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

async function analyzeSiteDetailed(browser, site) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`DETAILED ANALYSIS: ${site.name}`);
  console.log(`URL: ${site.url}`);
  console.log('='.repeat(100));

  const page = await browser.newPage();
  
  try {
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`\n✓ Page loaded successfully`);
    console.log(`  Final URL: ${currentUrl}`);
    
    // Get detailed board structure
    const boardAnalysis = await page.evaluate(() => {
      const result = {
        boardRows: [],
        boardSelector: null,
        titleSelector: null,
        dateSelector: null,
        linkPattern: null
      };
      
      // Try to find board rows with different selectors
      const selectors = [
        { name: 'table tbody tr', selector: 'table tbody tr' },
        { name: '.board_list li', selector: '.board_list li' },
        { name: 'ul.board_list li', selector: 'ul.board_list li' },
        { name: 'div.list-item', selector: 'div.list-item' },
        { name: 'li[class*="item"]', selector: 'li[class*="item"]' },
        { name: 'tr[class*="list"]', selector: 'tr[class*="list"]' },
        { name: 'div[class*="board"] li', selector: 'div[class*="board"] li' }
      ];
      
      for (const { name, selector } of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          result.boardSelector = selector;
          
          // Extract data from first 3 rows
          for (let i = 0; i < Math.min(3, elements.length); i++) {
            const row = elements[i];
            const rowData = {
              index: i,
              html: row.outerHTML.substring(0, 800),
              text: row.innerText.substring(0, 200),
              links: [],
              dates: []
            };
            
            // Find all links in this row
            const links = row.querySelectorAll('a');
            links.forEach(link => {
              const href = link.getAttribute('href');
              const text = link.innerText.trim();
              if (href && !href.includes('javascript') && text.length > 0) {
                rowData.links.push({
                  href: href,
                  text: text.substring(0, 100),
                  class: link.className
                });
              }
            });
            
            // Find date patterns
            const allText = row.innerText;
            const dateMatches = allText.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/g);
            if (dateMatches) {
              rowData.dates = dateMatches;
            }
            
            result.boardRows.push(rowData);
          }
          
          break;
        }
      }
      
      return result;
    });
    
    console.log(`\n📋 BOARD STRUCTURE:`);
    console.log(`  Board Selector: ${boardAnalysis.boardSelector}`);
    console.log(`  Rows found: ${boardAnalysis.boardRows.length}`);
    
    boardAnalysis.boardRows.forEach((row, idx) => {
      console.log(`\n  ROW ${idx + 1}:`);
      console.log(`    Links found: ${row.links.length}`);
      row.links.forEach((link, linkIdx) => {
        console.log(`      ${linkIdx + 1}. href: ${link.href}`);
        console.log(`         text: ${link.text}`);
        console.log(`         class: ${link.class}`);
      });
      if (row.dates.length > 0) {
        console.log(`    Dates: ${row.dates.join(', ')}`);
      }
    });
    
    // Try to click on first article and get detail page URL
    const firstArticleUrl = await page.evaluate(() => {
      const selectors = [
        'table tbody tr:first-child a',
        '.board_list li:first-child a',
        'ul.board_list li:first-child a',
        'div.list-item:first-child a'
      ];
      
      for (const selector of selectors) {
        const link = document.querySelector(selector);
        if (link) {
          const href = link.getAttribute('href');
          if (href && !href.includes('javascript')) {
            return href;
          }
        }
      }
      return null;
    });
    
    if (firstArticleUrl) {
      console.log(`\n🔗 FIRST ARTICLE LINK:`);
      console.log(`  Relative URL: ${firstArticleUrl}`);
      
      // Try to navigate to it
      try {
        const absoluteUrl = new URL(firstArticleUrl, site.url).href;
        console.log(`  Absolute URL: ${absoluteUrl}`);
        
        // Navigate to detail page
        await page.goto(absoluteUrl, { waitUntil: 'networkidle', timeout: 15000 });
        const detailUrl = page.url();
        console.log(`  Detail Page URL: ${detailUrl}`);
        
        // Get detail page structure
        const detailStructure = await page.evaluate(() => {
          return {
            title: document.querySelector('h1, h2, .title, .article-title')?.innerText || 'N/A',
            date: document.querySelector('.date, .regdate, .write-date, span[class*="date"]')?.innerText || 'N/A',
            content: document.querySelector('.content, .article-content, .view-content, #content')?.innerText?.substring(0, 200) || 'N/A'
          };
        });
        
        console.log(`\n📄 DETAIL PAGE STRUCTURE:`);
        console.log(`  Title: ${detailStructure.title}`);
        console.log(`  Date: ${detailStructure.date}`);
        console.log(`  Content preview: ${detailStructure.content}`);
        
      } catch (error) {
        console.log(`  ⚠ Could not navigate to detail page: ${error.message}`);
      }
    }
    
    console.log(`\n✓ Detailed analysis complete for ${site.name}`);
    
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
      await analyzeSiteDetailed(browser, site);
    }
  } finally {
    await browser.close();
  }
  
  console.log(`\n${'='.repeat(100)}`);
  console.log('DETAILED ANALYSIS COMPLETE');
  console.log('='.repeat(100));
}

main().catch(console.error);
