import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np

CLASSES = ['handwritten', 'invoice', 'form', 'printed_page']

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])  # imagenet mean/std — must match training
])

_model = None

def _get_model(model_path='models/document_classifier_v2.pt'):
    # singleton - loads once, reuses on every request
    global _model
    if _model is None:
        m = models.mobilenet_v2(weights=None)
        m.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(m.last_channel, len(CLASSES))
        )
        m.load_state_dict(torch.load(model_path, map_location='cpu'))
        m.eval()
        _model = m
        print(f'[classification_core] Model loaded from {model_path}')
    return _model

def _to_pil(image):
    # accepts PIL, numpy (RGB or BGR), or filepath — normalises to RGB PIL before the transform
    if isinstance(image, Image.Image):
        return image.convert('RGB')
    if isinstance(image, np.ndarray):
        if image.ndim == 3 and image.shape[2] == 3:
            image = image[:, :, ::-1]   # opencv loads BGR, PIL expects RGB — flip channel order
        return Image.fromarray(image.astype('uint8')).convert('RGB')
    if isinstance(image, str):
        return Image.open(image).convert('RGB')
    raise TypeError(f'Unsupported image type: {type(image)}')

def classify_document(image, model_path='models/document_classifier_v2.pt'):
    """runs inference, returns (class_name, confidence) e.g. ('invoice', 0.97)"""
    model  = _get_model(model_path)
    tensor = _transform(_to_pil(image)).unsqueeze(0)
    with torch.no_grad():
        probs      = torch.softmax(model(tensor), dim=1)
        conf, pred = probs.max(1)
    return CLASSES[pred.item()], round(conf.item(), 4)
