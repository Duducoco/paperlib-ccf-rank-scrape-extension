//这个函数计算最长公共字符串的长度，比如helloworld与hello,how are you. 公共字符串是hello，长度就是5
function longestCommonSubstringLength(str1: string, str2: string): number {
  let result = 0
  // 创建一个二维数组来存储最长公共子串的长度
  const dp = Array(str1.length + 1).fill(0).map(() => Array(str2.length + 1).fill(0));

  // 填充dp数组
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if ( i == 0 || j == 0){
        dp[i][j] = 0;
      }else if(str1[i-1] == str2[j-1]){
        dp[i][j] = dp[i-1][j-1] + 1;
        result = Math.max(dp[i][j], result);
      }else{
        dp[i][j] = 0;
      }
    }
  }
  return result
}
export {longestCommonSubstringLength}

