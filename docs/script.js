


// let uploadedImageBase64 = "";

// document.getElementById("profilePic").addEventListener("change", function (e) {
//   const file = e.target.files[0];
//   const reader = new FileReader();

//   reader.onload = function (event) {
//     uploadedImageBase64 = event.target.result;
//     document.getElementById("preview").src = uploadedImageBase64;
//   };

//   if (file) {
//     reader.readAsDataURL(file);
//   }
// });

// document.getElementById("cvForm").addEventListener("submit", function (e) {
//   e.preventDefault();

//   const data = {
//     name: document.getElementById("name").value,
//     email: document.getElementById("email").value,
//     phone: document.getElementById("phone").value,
//     education: document.getElementById("education").value,
//     skills: document.getElementById("skills").value,
//     experience: document.getElementById("experience").value,
//   };

//   const preview = document.getElementById("cvPreview");
//   preview.innerHTML = `
//     <div class="cv-left">
//       <img src="${uploadedImageBase64}" />
//       <h4>${data.name}</h4>
//     </div>
//     <div class="cv-right">
//       <div class="cv-section"><strong>Email:</strong> ${data.email}</div>
//       <div class="cv-section"><strong>Phone:</strong> ${data.phone}</div>
//       <div class="cv-section"><strong>Education:</strong><br>${data.education.replace(/\n/g, "<br>")}</div>
//       <div class="cv-section"><strong>Skills:</strong><br>${data.skills.replace(/\n/g, "<br>")}</div>
//       <div class="cv-section"><strong>Experience:</strong><br>${data.experience.replace(/\n/g, "<br>")}</div>
//     </div>
//   `;

//   document.getElementById("downloadBtn").style.display = "inline-block";
// });

// document.getElementById("downloadBtn").addEventListener("click", () => {
//   const cvElement = document.getElementById("cvPreview");

//   html2canvas(cvElement).then((canvas) => {
//     const imgData = canvas.toDataURL("image/png");
//     const { jsPDF } = window.jspdf;
//     const pdf = new jsPDF();

//     const imgProps = pdf.getImageProperties(imgData);
//     const pdfWidth = pdf.internal.pageSize.getWidth();
//     const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

//     pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
//     pdf.save("My_CV.pdf");
//   });
// });




let uploadedImageBase64 = "";

document.getElementById("profilePic").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    uploadedImageBase64 = event.target.result;
    document.getElementById("preview").src = uploadedImageBase64;
  };

  if (file) {
    reader.readAsDataURL(file);
  }
});

document.getElementById("cvForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    education: document.getElementById("education").value,
    skills: document.getElementById("skills").value,
    experience: document.getElementById("experience").value,
  };

  const preview = document.getElementById("cvPreview");
  preview.innerHTML = `
    <div class="cv-left">
      <img src="${uploadedImageBase64}" />
      <h4>${data.name}</h4>
    </div>
    <div class="cv-right">
      <div class="cv-section"><strong>Email:</strong> ${data.email}</div>
      <div class="cv-section"><strong>Phone:</strong> ${data.phone}</div>
      <div class="cv-section"><strong>Education:</strong><br>${data.education.replace(/\n/g, "<br>")}</div>
      <div class="cv-section"><strong>Skills:</strong><br>${data.skills.replace(/\n/g, "<br>")}</div>
      <div class="cv-section"><strong>Experience:</strong><br>${data.experience.replace(/\n/g, "<br>")}</div>
    </div>
  `;

  document.getElementById("downloadBtn").style.display = "inline-block";
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const cvElement = document.getElementById("cvPreview");

  html2canvas(cvElement).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("My_CV.pdf");
  });
});