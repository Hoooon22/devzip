package com.hoooon22.devzip.Model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * official-joke-api 응답을 매핑하는 DTO
 * Example response:
 * {
 *   "type": "general",
 *   "setup": "Why did the chicken cross the road?",
 *   "punchline": "To get to the other side!",
 *   "id": 1
 * }
 */
public class JokeResponse {

    @JsonProperty("type")
    private String type;

    @JsonProperty("setup")
    private String setup;

    @JsonProperty("punchline")
    private String punchline;

    @JsonProperty("id")
    private Integer id;

    // Constructors
    public JokeResponse() {}

    public JokeResponse(String type, String setup, String punchline, Integer id) {
        this.type = type;
        this.setup = setup;
        this.punchline = punchline;
        this.id = id;
    }

    // Getters and Setters
    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSetup() {
        return setup;
    }

    public void setSetup(String setup) {
        this.setup = setup;
    }

    public String getPunchline() {
        return punchline;
    }

    public void setPunchline(String punchline) {
        this.punchline = punchline;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    @Override
    public String toString() {
        return "JokeResponse{" +
                "type='" + type + '\'' +
                ", setup='" + setup + '\'' +
                ", punchline='" + punchline + '\'' +
                ", id=" + id +
                '}';
    }
}
