import React, { useEffect, useState } from "react";
import styles from "../../../../assets/css/ViewContainer.module.scss";
import axios from "../../../../utils/axiosConfig";

const PCSpecs = () => {

    return (
        <div className={styles.container}>
            <div>
                <h3>두 번째 컴포넌트</h3>
                
                <p>다른 내용이 들어갑니다.</p>
            </div>
        </div>
    );
};

export default PCSpecs;