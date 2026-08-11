export function calculateProfileCompletion(candidate:any){

  let completed = 0;

  const total = 6;


  if(candidate.headline)
    completed++;


  if(candidate.careerSummary)
    completed++;


  if(candidate.skills?.length)
    completed++;


  if(candidate.experiences?.length)
    completed++;


  if(candidate.educations?.length)
    completed++;


  if(candidate.resumeUrl)
    completed++;



  return {

    percentage:
      Math.round(
        (completed / total) * 100
      ),


    missingFields:[
      !candidate.headline && 'Headline',
      !candidate.careerSummary && 'Career Summary',
      !candidate.skills?.length && 'Skills',
      !candidate.experiences?.length && 'Experience',
      !candidate.educations?.length && 'Education',
      !candidate.resumeUrl && 'Resume',
    ].filter(Boolean),

  };

}