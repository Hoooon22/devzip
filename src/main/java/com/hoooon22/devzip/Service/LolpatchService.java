package com.hoooon22.devzip.Service;

import java.io.IOException;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

@Service
public class LolpatchService {

    public String getHTML() throws IOException {
		
		String patchURL = "https://www.leagueoflegends.com/ko-kr/news/game-updates/patch-14-17-notes/";
        
		//URL로부터 HTML 문서 가져오기
		Document doc = Jsoup.connect(patchURL).get();
        
		return doc.toString();       
    }
}
