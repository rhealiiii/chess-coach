const {test,expect}=require('@playwright/test');
test('mobile board visible, touch moves, real engine and controls',async({page},testInfo)=>{
 await page.goto('/');
 await expect(page.locator('.sq')).toHaveCount(64);await expect(page.locator('.piece-svg')).toHaveCount(32);
 await expect(page.locator('#engine')).toContainText('推荐：',{timeout:60000});
 await expect(page.locator('#board')).toHaveAttribute('aria-busy','false',{timeout:60000});
 for(const [width,height] of [[320,568],[375,667],[390,664],[390,844],[430,932]]){
  await page.setViewportSize({width,height});
  const box=await page.locator('#board').boundingBox();expect(box.width).toBeGreaterThan(240);expect(Math.abs(box.width-box.height)).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  const warning=await page.locator('#warning').boundingBox();expect(warning.y+warning.height).toBeLessThanOrEqual(height);
  const svg=await page.locator('.piece-svg').first().boundingBox();expect(svg.width).toBeGreaterThan(20);expect(svg.height).toBeGreaterThan(20);
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:testInfo.outputPath('mobile-initial.png'),fullPage:true});
 await page.locator('[data-square="e2"]').tap();await expect(page.locator('.target')).toHaveCount(2);await page.locator('[data-square="e4"]').tap();
 await expect(page.locator('#feedback')).toContainText('走棋前推荐',{timeout:60000});
 await expect(page.locator('#engine')).toContainText('推荐：',{timeout:60000});
 await page.screenshot({path:testInfo.outputPath('mobile-analysis.png'),fullPage:true});
 await page.locator('#undo').tap();await expect(page.locator('#history')).toHaveText('尚未走棋');
 await page.locator('#view').selectOption('b');await expect(page.locator('.sq').first()).toHaveAttribute('data-square','h1');
 await page.locator('#restart').tap();await expect(page.locator('.piece-svg')).toHaveCount(32);
});
