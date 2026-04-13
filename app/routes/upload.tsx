import {type FormEvent, useState} from 'react';
import React from "react";
import Navbar from "~/components/navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const handleFileSelect = (file: File | null) => {
        setFile(file);
    }
    const navigate = useNavigate();
    const{auth,isLoading,fs,ai,kv} = usePuterStore();

    const handleAnalyze=async ({companyName,jobTitle,jobDescription,file}:{companyName:string , jobTitle:string , jobDescription:string , file:File})=>{

        setIsProcessing(true);
        setStatus('Uploading file...');
        const uploadedFile = await fs.upload([file]);

        if(!uploadedFile) return setStatus('Error: File upload failed');
        setStatus('Converting to image...');
        const imageFile = await convertPdfToImage(file);
        if(!imageFile.file) return setStatus('Error: Failed to convert pdf to image');
        setStatus('Uploading the image...');
        const uploadImage = await fs.upload([imageFile.file]);
        if(!uploadImage)setStatus('Error: Image upload failed');

        setStatus('Preparing data...');
        const uuid= generateUUID();
        const data={
            id:uuid,
            resumePath:uploadedFile.path,
            imagePath:imageFile.file,
            companyName,jobTitle,jobDescription,
            feedback:'',
        }
        await kv.set(`resume:${uuid}`,JSON.stringify(data));
        setStatus('Analyzing...');
        const feedback= await ai.feedback(
            uploadedFile.path,
            prepareInstructions({jobTitle,jobDescription})
        )
        if(!feedback) return setStatus('Error: Failed to analyze resume');
        const feedbackText = typeof feedback.message.content ==='string' ? feedback.message.content : feedback.message.content[0].text;
        data.feedback = JSON.parse(feedbackText);
        await kv.set(`resume:${uuid}`,JSON.stringify(data));
        setStatus('Analysis complete, redirecting...');
        console.log(data);
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form=e.currentTarget.closest("form");
        if(!form) return;
        const formData = new FormData(form);
        const companyName = formData.get("company-name")as string;
        const jobTitle = formData.get("job-title")as string;
        const jobDescription = formData.get("job-description")as string;

        if(!file){
            return;
        }
        handleAnalyze({companyName,jobTitle,jobDescription,file});
    }
    return (
        <main className="bg-[url('/public/images/bg-main.svg')] bg-cover">
            <Navbar/>
            <section className={"main-section"}>
                <div className='page-heading py-16'>
                    <h1>Smart feedback for your job</h1>
                    {isProcessing ? (
                        <>
                        <h2>{status}</h2>
                        <img src='/public/images/resume-scan.gif' className='w-full'/>
                        </>
                    ) : (
                        <h2>Drop your resume for ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form id='upload-form' onSubmit={handleSubmit} className='flex flex-col gap-4 mt-8'>
                            <div className='form-div'>
                                <label htmlFor="company-name">Company Name</label>
                                <input type='text' name='company-name' placeholder="Company Name" id="company-name" />
                            </div>

                            <div className='form-div'>
                                <label htmlFor="job-title">Job Title</label>
                                <input type='text' name='job-title' placeholder="Job Title" id="job-title" />
                            </div>

                            <div className='form-div'>
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name='job-description' placeholder="Job Description" id="job-description" />
                            </div>

                            <div className='form-div'>
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>
                            <button type='submit' className='primary-button'>Analyze</button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;