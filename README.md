# Smart Automated Grading Engine

## Overview

The Smart Automated Grading Engine is a full-stack web application designed to streamline the process of evaluating handwritten or printed exam scripts. By leveraging Optical Character Recognition (OCR) and AI-based assessment, the system automates answer extraction and grading, significantly reducing manual effort while improving accuracy and consistency.

## Key Features

* **Automated Answer Evaluation**: Uses AI models to analyze and grade student responses.
* **OCR Integration**: Extracts text from uploaded images of answer sheets.
* **User-Friendly Interface**: Intuitive frontend for seamless interaction.
* **Cloud Storage Support**: Secure storage and retrieval of uploaded files.
* **Result Management**: Stores and displays evaluated results efficiently.

## Tech Stack

### Frontend

* React.js

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### APIs & Services

* Gemini API (for OCR extraction and evaluation)
* AWS S3 (for file storage)
* Render
* Vercel

## System Architecture

The system follows a client-server architecture:

1. The user uploads an answer sheet via the frontend.
2. The backend processes the file and uploads it to cloud storage.
3. OCR is applied to extract textual data from the document.
4. Extracted text is passed to an AI model for evaluation.
5. Results are stored in the database and displayed to the user.

## Architectural Diagram   

![arch diagram](https://github.com/user-attachments/assets/f670fa84-d5ee-4186-8b95-269f4daa4113)


## User Roles and Functionalities   

### Admin

* Manages teacher and student profiles.
* Manage Classes and Courses.
* Assign Course Mapping.

### Teacher

* Can initiate the evaluation process by uploading question paper, marking scheme, reference text (not compulsory) and answer scripts of students (either as files or a folder).
* Can view the generated reference answer keys.
* Can view the results of the evaluation stored in the form of a detailed mark matrix which can be exported as Excel sheets.
* Can view the reva;uation requests raised by the students.

### Student

* Can view the result of the exams.
* Can request for revaluation.
* Can view the reference answer keys.

## Deployement
The system is deployed using Vercel and Render.   
The deployed link is given below   
[Smart Automated Grading Engine](https://smartautomatedgradingengine.vercel.app/login)

## Advantages

* Reduces manual grading time
* Minimizes human error
* Scalable and efficient
* Enhances evaluation consistency

## Limitations

* OCR accuracy may vary depending on handwriting quality
* Requires stable internet connection for API services

## Future Enhancements

* Improved handwriting recognition
* Support for multiple languages
* Advanced analytics and reporting dashboard
* Integration with Learning Management Systems (LMS)
