import { PLAPI, PLExtAPI, PLExtension, PLMainAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { ccf_rank } from "./ccf-rank.ts";
import {longestCommonSubstringLength} from "./utils.ts"


//论文的出版处，可以是会议或者期刊的名字
//这个论文的出版处是一个会议，名字叫Design Automation Conference，这个名字在前面的ccf_rank中存储着它对应的CCF等级
//但是实际中，软件获取到的论文的出版处可能有多余的信息，比如"Proceedings of"，表示这是一个会议，59th表示是第59届
//为了能尽可能准确地在ccf_rank中找到对应的条目，需要进行尽可能准确的匹配
// const paperPublication = "Proceedings of the 59th ACM/IEEE Design Automation Conference"

const replaceAll = (input: string, search: string, replacement: string): string => {  
  return input.split(search).join(replacement);  
};  

const processString = (input:string): string =>{
  input = replaceAll(input, "Proceedings of the", "");
  input = replaceAll(input, "ACM/IEEE", "");
  input = replaceAll(input, "International Conference", "");
  input = replaceAll(input, " ", "");
  return input
}

class PaperlibCCFRankScrapeExtension extends PLExtension {
  disposeCallbacks: (() => void)[];

  constructor() {
    super({
      id: "paperlib-ccf-rank-scrape-extension",
      defaultPreference: {}
    });

    this.disposeCallbacks = [];
  }

  async initialize() {
    await PLExtAPI.extensionPreferenceService.register(
      this.id,
      this.defaultPreference
    );

    this.disposeCallbacks.push(
      PLAPI.uiStateService.onChanged("selectedPaperEntities", (newValues) => {
        if (newValues.value.length === 1) {
          this.getCCFRank(newValues.value[0]);
        }
      })
    );
  }

  async getCCFRank(paperEntity: PaperEntity) {
    const paperPublication = paperEntity.publication;
    let rank = "CCF-none";
    // let max_similarity = 0;
    // let max_similarity_index = 0;

    let longestCommonStringLength = 0
    let longestCommonStringLengthIndexes:number[] = []
    let longestCommonStringLengthIndex = 0

    for (let i = 0; i < ccf_rank.length; i++) {
      //1. 第一种方式
      //使用正则提取publication 小括号中的内容
      let reg = /(?<=\()(.+?)(?=\))/;
      //提取正则匹配的字符串，第一个
      // @ts-ignore
      let short_publication = paperPublication.match(reg) ? paperPublication.match(reg)[0] : "";
      if (short_publication !== "" && short_publication === ccf_rank[i].short_name){
        rank = ccf_rank[i].CCF_Rank;
        longestCommonStringLengthIndexes = []
        break;
      }

      //2. 第二种方式
      if (ccf_rank[i].short_name !== "" && paperPublication === ccf_rank[i].short_name) {
        rank = ccf_rank[i].CCF_Rank;
        longestCommonStringLengthIndexes = []
        break;
      }

      //第3种方式，计算最长公共子串
      let processed_paperPublication = processString(paperPublication)
      let processedCCFRankFullName = processString(ccf_rank[i].full_name)


      let commonSubstringLength = longestCommonSubstringLength(processed_paperPublication,processedCCFRankFullName)
      if (commonSubstringLength > longestCommonStringLength){
        longestCommonStringLength = commonSubstringLength
        longestCommonStringLengthIndexes = []
        longestCommonStringLengthIndexes.push(i)
      }else if(commonSubstringLength === longestCommonStringLength){
        longestCommonStringLength = commonSubstringLength
        longestCommonStringLengthIndexes.push(i)
      }else{

      }
    }


    //计算字符串覆盖率，防止出现两个刊物的名字，其中一个是另一个的子串的情况
    let max_coverage_rate = 0
    let max_coverage_rate_index = 0
    for (let i = 0; i < longestCommonStringLengthIndexes.length; i++){
      let temp = processString(ccf_rank[longestCommonStringLengthIndexes[i]].full_name)
      let coverage_rate = longestCommonStringLength / temp.length
      if (coverage_rate > max_coverage_rate){
        max_coverage_rate = coverage_rate
        max_coverage_rate_index = longestCommonStringLengthIndexes[i]
      }
    }
    if (max_coverage_rate > 0.8){
      rank = ccf_rank[max_coverage_rate_index].CCF_Rank
    }else{
      
    }

    let rank_html = ""
    if (rank === "CCF-A"){
      rank_html = `<text style="padding: 2px 4px;border-radius: 10px; background-color: orangered; color:white"><b>${rank}</b></text>`
    }else if(rank === "CCF-B"){
      rank_html = `<text style="padding: 2px 4px;border-radius: 10px; background-color: Orange; color:white"><b>${rank}</b></text>`
    }else if(rank === "CCF-C"){
      rank_html = `<text style="padding: 2px 4px;border-radius: 10px; background-color: limegreen; color:white"><b>${rank}</b></text>`
    }else{
      rank_html = `<text style="padding: 2px 4px;border-radius: 10px; background-color: lightgrey; color:white"><b>${rank}</b></text>`
    }
    //将rank显示在ui插槽里,使用html
    await PLAPI.uiSlotService.updateSlot(
      "paperDetailsPanelSlot1",
      {
        "paperlib-ccf-rank-scrape": {
          title: "CCF Rank",
          content: rank_html
        }
      }
    );
  }


  async dispose() {
    PLExtAPI.extensionPreferenceService.unregister(this.id);
    for (const disposeCallback of this.disposeCallbacks) {
      disposeCallback();
    }
  }
}

async function initialize() {
  const extension = new PaperlibCCFRankScrapeExtension();
  await extension.initialize();

  return extension;
}

export { initialize };