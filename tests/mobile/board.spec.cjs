const {test,expect}=require('@playwright/test');
test('minimal mobile play and opt-in coaching',async({page},testInfo)=>{
 await page.goto('/');await expect(page.locator('#board .sq')).toHaveCount(64);await expect(page.locator('#board .piece-svg')).toHaveCount(32);
 await expect(page.locator('#review')).toBeDisabled();await expect(page.locator('#coach')).not.toBeVisible();await expect(page.locator('[data-route]')).toHaveCount(0);
 for(const [width,height] of [[320,568],[375,667],[390,664],[390,844],[430,932]]){
  await page.setViewportSize({width,height});const box=await page.locator('#board').boundingBox();expect(box.width).toBeGreaterThan(240);expect(Math.abs(box.width-box.height)).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  const footer=await page.locator('footer').boundingBox();expect(footer.y+footer.height).toBeLessThanOrEqual(height+1);
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:testInfo.outputPath('minimal-play.png'),fullPage:true});
 await page.locator('#board [data-square="b8"]').tap();await expect(page.locator('#board .target')).toHaveCount(2);await expect(page.locator('#status')).toContainText('预览');
 await page.locator('#board [data-square="e2"]').tap();await expect(page.locator('#board .target')).toHaveCount(2);await page.locator('#board [data-square="e4"]').tap();
 await expect(page.locator('#board')).toHaveAttribute('aria-busy','false',{timeout:60000});await expect(page.locator('#turn')).toContainText('轮到你');await expect(page.locator('#review')).toBeEnabled();await expect(page.locator('[data-route]')).toHaveCount(0);
 await page.locator('#review').tap();await expect(page.locator('#review-content')).toBeVisible({timeout:60000});await expect(page.locator('#review-played')).toContainText('e2 → e4');await expect(page.locator('#review-best')).not.toBeEmpty();await expect(page.locator('#review-knowledge')).not.toBeEmpty();await expect(page.locator('#review-board .sq')).toHaveCount(64);await expect(page.locator('[data-route="last"]')).toHaveCount(1);
 await page.screenshot({path:testInfo.outputPath('on-demand-coaching.png'),fullPage:true});await page.locator('#coach-close').tap();await expect(page.locator('#coach')).not.toBeVisible();
 await page.locator('#undo').tap();await expect(page.locator('#review')).toBeDisabled();
 await page.locator('#menu-open').tap();await expect(page.locator('#menu')).toBeVisible();await page.locator('#view').selectOption('b');await page.locator('#menu-close').tap();await expect(page.locator('#board .sq').first()).toHaveAttribute('data-square','h1');
 await page.locator('#restart').tap();await expect(page.locator('#board .piece-svg')).toHaveCount(32);
});
