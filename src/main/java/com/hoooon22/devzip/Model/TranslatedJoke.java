package com.hoooon22.devzip.Model;

/**
 * 번역된 농담을 클라이언트에 반환하는 DTO
 */
public class TranslatedJoke {

    private String originalSetup;
    private String originalPunchline;
    private String translatedSetup;
    private String translatedPunchline;
    private String type;

    // Constructors
    public TranslatedJoke() {}

    public TranslatedJoke(String originalSetup, String originalPunchline,
                         String translatedSetup, String translatedPunchline, String type) {
        this.originalSetup = originalSetup;
        this.originalPunchline = originalPunchline;
        this.translatedSetup = translatedSetup;
        this.translatedPunchline = translatedPunchline;
        this.type = type;
    }

    // Getters and Setters
    public String getOriginalSetup() {
        return originalSetup;
    }

    public void setOriginalSetup(String originalSetup) {
        this.originalSetup = originalSetup;
    }

    public String getOriginalPunchline() {
        return originalPunchline;
    }

    public void setOriginalPunchline(String originalPunchline) {
        this.originalPunchline = originalPunchline;
    }

    public String getTranslatedSetup() {
        return translatedSetup;
    }

    public void setTranslatedSetup(String translatedSetup) {
        this.translatedSetup = translatedSetup;
    }

    public String getTranslatedPunchline() {
        return translatedPunchline;
    }

    public void setTranslatedPunchline(String translatedPunchline) {
        this.translatedPunchline = translatedPunchline;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    @Override
    public String toString() {
        return "TranslatedJoke{" +
                "originalSetup='" + originalSetup + '\'' +
                ", originalPunchline='" + originalPunchline + '\'' +
                ", translatedSetup='" + translatedSetup + '\'' +
                ", translatedPunchline='" + translatedPunchline + '\'' +
                ", type='" + type + '\'' +
                '}';
    }
}
