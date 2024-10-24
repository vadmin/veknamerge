Insert into F_STU_GRAD_PGM (ACAD_YR,COLL_NAME,SUBM_NUM,LEA_ID,STU_UNQ_ID,CAMP_ID,FHSP_PART_CD,FHSP_DIST_ACHV_CD,STEM_ENDORSE_CD,BIZ_INDUST_ENDORSE_CD,PUBL_SVC_ENDORSE_CD,ARTS_HUMAN_ENDORSE_CD,MULTI_DISC_ENDORSE_CD,UPDATE_DTTM,UPDATE_USER,IGC_REVIEW_CD,PS_CERT_LIC_1_CD,PS_CERT_LIC_2_CD,PS_CERT_LIC_3_CD,FIN_AID_APP_CD,TX1ST_EARLY_HS_CD) values (2025,'FALL',1,'061905','4601532213','061905041',null,'2','2',null,'2',null,'2',to_timestamp('14-OCT-24 01.26.39.949746000 PM','DD-MON-RR HH.MI.SSXFF AM'),'47288,234936',null,null,null,null,'02','01');
Insert into F_STU_GRAD_PGM (ACAD_YR,COLL_NAME,SUBM_NUM,LEA_ID,STU_UNQ_ID,CAMP_ID,FHSP_PART_CD,FHSP_DIST_ACHV_CD,STEM_ENDORSE_CD,BIZ_INDUST_ENDORSE_CD,PUBL_SVC_ENDORSE_CD,ARTS_HUMAN_ENDORSE_CD,MULTI_DISC_ENDORSE_CD,UPDATE_DTTM,UPDATE_USER,IGC_REVIEW_CD,PS_CERT_LIC_1_CD,PS_CERT_LIC_2_CD,PS_CERT_LIC_3_CD,FIN_AID_APP_CD,TX1ST_EARLY_HS_CD) values (2025,'FALL',1,'061905','4601681103','061905041',null,'2','2',null,'2',null,null,to_timestamp('14-OCT-24 01.26.39.949746000 PM','DD-MON-RR HH.MI.SSXFF AM'),'47288,234936',null,null,null,null,'01','01');
Insert into F_STU_GRAD_PGM (ACAD_YR,COLL_NAME,SUBM_NUM,LEA_ID,STU_UNQ_ID,CAMP_ID,FHSP_PART_CD,FHSP_DIST_ACHV_CD,STEM_ENDORSE_CD,BIZ_INDUST_ENDORSE_CD,PUBL_SVC_ENDORSE_CD,ARTS_HUMAN_ENDORSE_CD,MULTI_DISC_ENDORSE_CD,UPDATE_DTTM,UPDATE_USER,IGC_REVIEW_CD,PS_CERT_LIC_1_CD,PS_CERT_LIC_2_CD,PS_CERT_LIC_3_CD,FIN_AID_APP_CD,TX1ST_EARLY_HS_CD) values (2025,'FALL',1,'061905','4601828414','061905101',null,'2','2',null,null,null,null,to_timestamp('14-OCT-24 01.26.39.949746000 PM','DD-MON-RR HH.MI.SSXFF AM'),'47288,234936',null,null,null,null,'01','02');



Insert into
    T_REPORT_COLUMN (
        DATA_SRCH_TBL_MAP_ID,
        COLUMN_NAME,
        COLUMN_DESC,
        REQUIRED_FLAG,
        SEARCH_ORDER,
        RESULT_ORDER,
        DATA_TYPE,
        DATA_LENGTH,
        UPDATE_USER,
        UPDATE_DTTM,
        COLUMN_SHORT_NAME,
        COLUMN_POSITION,
        AUTO_COMPLETE_ESC,
        AUTO_COMPLETE_DISTRICT,
        AUTO_COMPLETE_CAMPUS
    )
values
    (
        186,
        'CLASS_SECT_ID',
        'Class ID Number',
        1,
        0,
        5,
        'text',
        14,
        'SCH_PEIMS_APP',
        SYSTIMESTAMP,
        'Class ID #',
        null,
        0,
        0,
        0
    );

Insert into
    T_REPORT_COLUMN (
        DATA_SRCH_TBL_MAP_ID,
        COLUMN_NAME,
        COLUMN_DESC,
        REQUIRED_FLAG,
        SEARCH_ORDER,
        RESULT_ORDER,
        DATA_TYPE,
        DATA_LENGTH,
        UPDATE_USER,
        UPDATE_DTTM,
        COLUMN_SHORT_NAME,
        COLUMN_POSITION,
        AUTO_COMPLETE_ESC,
        AUTO_COMPLETE_DISTRICT,
        AUTO_COMPLETE_CAMPUS
    )
values
    (
        186,
        'CLASS_ID',
        'Class ID Number',
        1,
        0,
        5,
        'text',
        14,
        'SCH_PEIMS_APP',
        SYSTIMESTAMP,
        'Class ID #',
        null,
        0,
        0,
        0
    );

Insert into
    T_REPORT_COLUMN (
        DATA_SRCH_TBL_MAP_ID,
        COLUMN_NAME,
        COLUMN_DESC,
        REQUIRED_FLAG,
        SEARCH_ORDER,
        RESULT_ORDER,
        DATA_TYPE,
        DATA_LENGTH,
        UPDATE_USER,
        UPDATE_DTTM,
        COLUMN_SHORT_NAME,
        COLUMN_POSITION,
        AUTO_COMPLETE_ESC,
        AUTO_COMPLETE_DISTRICT,
        AUTO_COMPLETE_CAMPUS
    )
values
    (
        186,
        'SECT_ID',
        'Class ID Number',
        1,
        0,
        5,
        'text',
        14,
        'SCH_PEIMS_APP',
        SYSTIMESTAMP,
        'Class ID #',
        null,
        0,
        0,
        0
    );

MERGE INTO T_CATGY_MSTR A USING (
    SELECT
        5 as CATGY_ID,
        'Campus Course Section' as DESC_SHORT,
        'Campus Course Section Category' as DESC_LONG,
        'Richard' as UPDATE_USER,
        TO_TIMESTAMP (
            '3/8/2013 12:55:59.064000 PM',
            'fmMMfm/fmDDfm/YYYY fmHH12fm:MI:SS.FF AM'
        ) as UPDATE_DTTM,
        'CampusCourseSec' as TEAL_SHORT_DESC
    FROM
        DUAL
) B ON (A.CATGY_ID = B.CATGY_ID) WHEN NOT MATCHED THEN INSERT (
    CATGY_ID,
    DESC_SHORT,
    DESC_LONG,
    UPDATE_USER,
    UPDATE_DTTM,
    TEAL_SHORT_DESC
)
VALUES
    (
        B.CATGY_ID,
        B.DESC_SHORT,
        B.DESC_LONG,
        B.UPDATE_USER,
        B.UPDATE_DTTM,
        B.TEAL_SHORT_DESC
    ) WHEN MATCHED THEN
UPDATE
SET
    A.DESC_SHORT = B.DESC_SHORT,
    A.DESC_LONG = B.DESC_LONG,
    A.UPDATE_USER = B.UPDATE_USER,
    A.UPDATE_DTTM = B.UPDATE_DTTM,
    A.TEAL_SHORT_DESC = B.TEAL_SHORT_DESC;


